import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import { applyCanonicalSchema, IngestionSessionRepository } from "../../src/storage/index.js";
import {
  createConfiguredIngestionLlmClient,
  extractIngestionSession,
  submitIngestionSession
} from "../../src/services/ingestion-session.js";
import { IngestionConflictError } from "../../src/services/ingestion-review.js";

function createTestClient() {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  return { pool };
}

function validCharacterPayload(name: string, sessionId = "session:incremental") {
  return {
    entityId: `character:${name.toLowerCase()}`,
    storyId: "story:incremental",
    revisionId: "revision:incremental:1",
    entityKind: "character" as const,
    name,
    aliases: [],
    description: "",
    archetypes: [],
    defaultLoyalties: []
  };
}

describe("incremental extraction workflow", () => {
  let pool: Pool;
  let ingestionSessionRepository: IngestionSessionRepository;

  beforeEach(async () => {
    const created = createTestClient();
    pool = created.pool;
    await applyCanonicalSchema(pool);
    ingestionSessionRepository = new IngestionSessionRepository(pool);
  });

  afterEach(async () => {
    await pool.end();
  });

  it("extracts only selected segmentIds and preserves untouched approved segments", async () => {
    let retryMode: "initial" | "selected-retry" = "initial";
    const retryCalls: string[] = [];
    const llmClient = createConfiguredIngestionLlmClient({
      modelName: "test-model",
      extractor: async ({ segmentId }) => {
        retryCalls.push(`${retryMode}:${segmentId}`);
        const name = segmentId.endsWith(":1") ? "Alice" : "Bob";
        return {
          candidates: [
            {
              candidateId: `${segmentId}:${retryMode}`,
              candidateKind: "entity" as const,
              canonicalKey: `entity:${name.toLowerCase()}`,
              confidence: 0.95,
              sourceSpanStart: 0,
              sourceSpanEnd: name.length,
              provenanceDetail: { retryMode },
              payload: validCharacterPayload(name)
            }
          ]
        };
      }
    });

    const submitted = await submitIngestionSession(
      {
        sessionId: "session:incremental",
        submissionKind: "full_draft",
        text: "Alice waits.\n\nBob leaves.",
        storyId: "story:incremental",
        revisionId: "revision:incremental:1"
      },
      {
        ingestionSessionRepository,
        llmClient,
        now: () => "2026-04-11T06:00:00Z",
        generateId: () => "incremental"
      }
    );

    await extractIngestionSession("session:incremental", {
      ingestionSessionRepository,
      llmClient,
      now: () => "2026-04-11T06:01:00Z",
      generateId: () => "incremental"
    });

    const approvedAt = "2026-04-11T06:02:00Z";
    await ingestionSessionRepository.approveSegment("session:incremental", "segment:session:incremental:2", {
      approvedAt,
      updatedAt: approvedAt
    });

    retryMode = "selected-retry";
    retryCalls.length = 0;
    const retried = await extractIngestionSession("session:incremental", {
      ingestionSessionRepository,
      llmClient,
      now: () => "2026-04-11T06:03:00Z",
      generateId: () => "incremental",
      targetSegmentIds: ["segment:session:incremental:1"],
      allowApprovalReset: true
    } as never);

    expect(submitted.segments).toHaveLength(2);
    expect(retryCalls).toEqual(["selected-retry:segment:session:incremental:1"]);
    expect(retried.segments[1]?.segment.approvedAt).toBe(approvedAt);
    expect((retried.segments[0] as any).attempts).toHaveLength(2);
    expect((retried.segments[1] as any).attempts).toHaveLength(1);
  });

  it("records failed attempts without deleting prior successful candidates", async () => {
    let retryMode: "initial" | "retry-fail" = "initial";
    const llmClient = createConfiguredIngestionLlmClient({
      modelName: "test-model",
      extractor: async ({ segmentId }) => {
        if (retryMode === "retry-fail" && segmentId.endsWith(":1")) {
          throw new Error("Extractor failure for segment 1 that should be truncated into a bounded summary.");
        }

        const name = segmentId.endsWith(":1") ? "Alice" : "Bob";
        return {
          candidates: [
            {
              candidateId: `${segmentId}:${retryMode}`,
              candidateKind: "entity" as const,
              canonicalKey: `entity:${name.toLowerCase()}`,
              confidence: 0.95,
              sourceSpanStart: 0,
              sourceSpanEnd: name.length,
              provenanceDetail: { retryMode },
              payload: validCharacterPayload(name)
            }
          ]
        };
      }
    });

    await submitIngestionSession(
      {
        sessionId: "session:incremental",
        submissionKind: "full_draft",
        text: "Alice waits.\n\nBob leaves.",
        storyId: "story:incremental",
        revisionId: "revision:incremental:1"
      },
      {
        ingestionSessionRepository,
        llmClient,
        now: () => "2026-04-11T06:10:00Z",
        generateId: () => "incremental"
      }
    );

    await extractIngestionSession("session:incremental", {
      ingestionSessionRepository,
      llmClient,
      now: () => "2026-04-11T06:11:00Z",
      generateId: () => "incremental"
    });

    retryMode = "retry-fail";
    const retried = await extractIngestionSession("session:incremental", {
      ingestionSessionRepository,
      llmClient,
      now: () => "2026-04-11T06:12:00Z",
      generateId: () => "incremental",
      targetSegmentIds: ["segment:session:incremental:1"],
      allowApprovalReset: true
    } as never);

    expect((retried as any).progressSummary.totalSegments).toBe(2);
    expect((retried as any).progressSummary.failedSegments).toBe(1);
    expect(retried.segments[0]?.candidates[0]?.candidateId).toBe("segment:session:incremental:1:initial");
    expect((retried.segments[0] as any).segment.lastFailureSummary).toContain("Extractor failure for segment 1");
    expect((retried.segments[0] as any).attempts.map((attempt: { status: string }) => attempt.status)).toEqual([
      "success",
      "failed"
    ]);
  });

  it("requires allowApprovalReset before retrying approved segments", async () => {
    const llmClient = createConfiguredIngestionLlmClient({
      modelName: "test-model",
      extractor: async ({ segmentId }) => {
        const name = segmentId.endsWith(":1") ? "Alice" : "Bob";
        return {
          candidates: [
            {
              candidateId: `${segmentId}:initial`,
              candidateKind: "entity" as const,
              canonicalKey: `entity:${name.toLowerCase()}`,
              confidence: 0.95,
              sourceSpanStart: 0,
              sourceSpanEnd: name.length,
              provenanceDetail: { source: "fixture" },
              payload: validCharacterPayload(name)
            }
          ]
        };
      }
    });

    await submitIngestionSession(
      {
        sessionId: "session:incremental",
        submissionKind: "full_draft",
        text: "Alice waits.\n\nBob leaves.",
        storyId: "story:incremental",
        revisionId: "revision:incremental:1"
      },
      {
        ingestionSessionRepository,
        llmClient,
        now: () => "2026-04-11T06:20:00Z",
        generateId: () => "incremental"
      }
    );

    await extractIngestionSession("session:incremental", {
      ingestionSessionRepository,
      llmClient,
      now: () => "2026-04-11T06:21:00Z",
      generateId: () => "incremental"
    });

    await ingestionSessionRepository.approveSegment("session:incremental", "segment:session:incremental:2", {
      approvedAt: "2026-04-11T06:22:00Z",
      updatedAt: "2026-04-11T06:22:00Z"
    });

    await expect(
      extractIngestionSession("session:incremental", {
        ingestionSessionRepository,
        llmClient,
        now: () => "2026-04-11T06:23:00Z",
        generateId: () => "incremental",
        targetSegmentIds: ["segment:session:incremental:2"]
      } as never)
    ).rejects.toMatchObject({
      name: IngestionConflictError.name,
      message: "Approved segments require allowApprovalReset=true before retry."
    });
  });
});
