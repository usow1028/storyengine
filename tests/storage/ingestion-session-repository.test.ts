import { beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import {
  applyCanonicalSchema,
  IngestionSessionRepository
} from "../../src/storage/index.js";
import type { StructuredExtractionBatch } from "../../src/domain/index.js";

function createTestClient() {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  return { pool };
}

describe("ingestion session repository", () => {
  let pool: Pool;

  beforeEach(async () => {
    const created = createTestClient();
    pool = created.pool;
    await applyCanonicalSchema(pool);
  });

  it("persists session, segments, and extraction candidates with correctedPayload and source spans", async () => {
    const repository = new IngestionSessionRepository(pool);

    await repository.createSession({
      sessionId: "session:test",
      storyId: "story:test",
      revisionId: "revision:test",
      draftTitle: "Draft",
      defaultRulePackName: "reality-default",
      inputKind: "chunk",
      rawText: "Alice crosses the bridge.",
      workflowState: "submitted",
      promptFamily: "phase5-default",
      modelName: "test-model",
      lastVerdictRunId: null,
      createdAt: "2026-04-10T02:00:00Z",
      updatedAt: "2026-04-10T02:00:00Z",
      lastCheckedAt: null
    });

    await repository.saveSegments("session:test", [
      {
        segmentId: "segment:test:1",
        sessionId: "session:test",
        sequence: 0,
        label: "Chunk 1",
        startOffset: 0,
        endOffset: 25,
        segmentText: "Alice crosses the bridge.",
        workflowState: "submitted",
        approvedAt: null
      }
    ]);

    const batch: StructuredExtractionBatch = {
      sessionId: "session:test",
      segments: [
        {
          segmentId: "segment:test:1",
          workflowState: "needs_review",
          candidates: [
            {
              candidateId: "candidate:test:1",
              sessionId: "session:test",
              segmentId: "segment:test:1",
              candidateKind: "entity",
              canonicalKey: "entity:alice",
              confidence: 0.64,
              reviewNeeded: true,
              reviewNeededReason: "low_confidence",
              sourceSpanStart: 0,
              sourceSpanEnd: 5,
              provenanceDetail: { source: "fixture" },
              extractedPayload: {
                entityId: "character:alice",
                storyId: "story:test",
                revisionId: "revision:test",
                entityKind: "character",
                name: "Alice",
                aliases: [],
                description: "",
                archetypes: [],
                defaultLoyalties: []
              },
              correctedPayload: {
                entityId: "character:alice",
                storyId: "story:test",
                revisionId: "revision:test",
                entityKind: "character",
                name: "Alice",
                aliases: ["Al"],
                description: "",
                archetypes: [],
                defaultLoyalties: []
              },
              normalizedPayload: {
                entityId: "character:alice",
                storyId: "story:test",
                revisionId: "revision:test",
                entityKind: "character",
                name: "Alice",
                aliases: [],
                description: "",
                archetypes: [],
                defaultLoyalties: []
              }
            }
          ]
        }
      ]
    };

    await repository.saveExtractionBatch(batch);
    await repository.setSessionState("session:test", "needs_review", {
      updatedAt: "2026-04-10T02:05:00Z"
    });

    const snapshot = await repository.loadSessionSnapshot("session:test");

    expect(snapshot.session.workflowState).toBe("needs_review");
    expect(snapshot.segments).toHaveLength(1);
    expect(snapshot.segments[0]?.segment.startOffset).toBe(0);
    expect(snapshot.segments[0]?.segment.endOffset).toBe(25);
    expect(snapshot.segments[0]?.candidates[0]?.correctedPayload).toEqual({
      entityId: "character:alice",
      storyId: "story:test",
      revisionId: "revision:test",
      entityKind: "character",
      name: "Alice",
      aliases: ["Al"],
      description: "",
      archetypes: [],
      defaultLoyalties: []
    });
    expect(snapshot.segments[0]?.candidates[0]?.sourceSpanStart).toBe(0);
    expect(snapshot.segments[0]?.candidates[0]?.sourceSpanEnd).toBe(5);
  });
});
