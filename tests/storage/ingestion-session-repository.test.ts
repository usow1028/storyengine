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

function validCharacterPayload(name: string, storyId = "story:test", revisionId = "revision:test") {
  return {
    entityId: `character:${name.toLowerCase()}`,
    storyId,
    revisionId,
    entityKind: "character" as const,
    name,
    aliases: [],
    description: "",
    archetypes: [],
    defaultLoyalties: []
  };
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
              extractedPayload: validCharacterPayload("Alice"),
              correctedPayload: {
                ...validCharacterPayload("Alice"),
                aliases: ["Al"]
              },
              normalizedPayload: validCharacterPayload("Alice")
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
      ...validCharacterPayload("Alice"),
      aliases: ["Al"]
    });
    expect(snapshot.segments[0]?.candidates[0]?.sourceSpanStart).toBe(0);
    expect(snapshot.segments[0]?.candidates[0]?.sourceSpanEnd).toBe(5);
  });

  it("keeps extractedPayload intact, persists boundary edits, and reaches partially_approved only after approval", async () => {
    const repository = new IngestionSessionRepository(pool);

    await repository.createSession({
      sessionId: "session:review",
      storyId: "story:test",
      revisionId: "revision:test",
      draftTitle: "Draft",
      defaultRulePackName: "reality-default",
      inputKind: "full_draft",
      rawText: "Alice waits.\n\nBob arrives.",
      workflowState: "needs_review",
      promptFamily: "phase5-default",
      modelName: "test-model",
      lastVerdictRunId: null,
      createdAt: "2026-04-10T02:10:00Z",
      updatedAt: "2026-04-10T02:10:00Z",
      lastCheckedAt: null
    });

    await repository.saveSegments("session:review", [
      {
        segmentId: "segment:review:1",
        sessionId: "session:review",
        sequence: 0,
        label: "Segment 1",
        startOffset: 0,
        endOffset: 11,
        segmentText: "Alice waits.",
        workflowState: "needs_review",
        approvedAt: null
      },
      {
        segmentId: "segment:review:2",
        sessionId: "session:review",
        sequence: 1,
        label: "Segment 2",
        startOffset: 13,
        endOffset: 24,
        segmentText: "Bob arrives.",
        workflowState: "extracted",
        approvedAt: null
      }
    ]);

    await repository.saveExtractionBatch({
      sessionId: "session:review",
      segments: [
        {
          segmentId: "segment:review:1",
          workflowState: "needs_review",
          candidates: [
            {
              candidateId: "candidate:review:1",
              sessionId: "session:review",
              segmentId: "segment:review:1",
              candidateKind: "entity",
              canonicalKey: "entity:alice",
              confidence: 0.92,
              reviewNeeded: true,
              reviewNeededReason: "normalization_failed",
              sourceSpanStart: 0,
              sourceSpanEnd: 5,
              provenanceDetail: { source: "fixture" },
              extractedPayload: { name: "Alice" },
              correctedPayload: null,
              normalizedPayload: null
            }
          ]
        },
        {
          segmentId: "segment:review:2",
          workflowState: "extracted",
          candidates: [
            {
              candidateId: "candidate:review:2",
              sessionId: "session:review",
              segmentId: "segment:review:2",
              candidateKind: "entity",
              canonicalKey: "entity:bob",
              confidence: 0.92,
              reviewNeeded: false,
              reviewNeededReason: null,
              sourceSpanStart: 0,
              sourceSpanEnd: 3,
              provenanceDetail: { source: "fixture" },
              extractedPayload: validCharacterPayload("Bob"),
              correctedPayload: null,
              normalizedPayload: validCharacterPayload("Bob")
            }
          ]
        }
      ]
    });

    const patched = await repository.applySegmentPatch(
      "session:review",
      "segment:review:1",
      {
        boundary: {
          label: "Scene One",
          startOffset: 1,
          endOffset: 12
        },
        candidateCorrections: [
          {
            candidateId: "candidate:review:1",
            correctedPayload: {
              ...validCharacterPayload("Alice"),
              aliases: ["Al"]
            }
          }
        ]
      },
      {
        updatedAt: "2026-04-10T02:11:00Z"
      }
    );

    expect(patched.session.workflowState).toBe("needs_review");
    expect(patched.segments[0]?.segment.label).toBe("Scene One");
    expect(patched.segments[0]?.segment.startOffset).toBe(1);
    expect(patched.segments[0]?.segment.endOffset).toBe(12);
    expect(patched.segments[0]?.candidates[0]?.extractedPayload).toEqual({ name: "Alice" });
    expect(patched.segments[0]?.candidates[0]?.correctedPayload).toEqual({
      ...validCharacterPayload("Alice"),
      aliases: ["Al"]
    });
    expect(patched.segments[0]?.candidates[0]?.normalizedPayload).toEqual({
      ...validCharacterPayload("Alice"),
      aliases: ["Al"]
    });

    const firstApproval = await repository.approveSegment("session:review", "segment:review:1", {
      approvedAt: "2026-04-10T02:12:00Z",
      updatedAt: "2026-04-10T02:12:00Z"
    });
    expect(firstApproval.sessionWorkflowState).toBe("partially_approved");

    const afterFirstApproval = await repository.loadSessionSnapshot("session:review");
    expect(afterFirstApproval.session.workflowState).toBe("partially_approved");

    const secondApproval = await repository.approveSegment("session:review", "segment:review:2", {
      approvedAt: "2026-04-10T02:13:00Z",
      updatedAt: "2026-04-10T02:13:00Z"
    });
    expect(secondApproval.sessionWorkflowState).toBe("approved");

    const approvedSegments = await repository.listApprovedSegments("session:review");
    expect(approvedSegments).toHaveLength(2);
  });
});
