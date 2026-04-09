import { beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import { applyCanonicalSchema, IngestionSessionRepository } from "../../src/storage/index.js";
import {
  createConfiguredIngestionLlmClient,
  extractIngestionSession,
  segmentSubmissionText,
  submitIngestionSession
} from "../../src/services/ingestion-session.js";

function createTestClient() {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  return { pool };
}

describe("natural language extraction", () => {
  let pool: Pool;
  let repository: IngestionSessionRepository;

  beforeEach(async () => {
    const created = createTestClient();
    pool = created.pool;
    await applyCanonicalSchema(pool);
    repository = new IngestionSessionRepository(pool);
  });

  it("segments a full_draft into reviewable units", () => {
    const segments = segmentSubmissionText({
      sessionId: "session:segmentation",
      inputKind: "full_draft",
      rawText: "Scene One\nAlice wakes up.\n\nScene Two\nAlice runs away."
    });

    expect(segments).toHaveLength(2);
    expect(segments[0]?.label).toBe("Scene One");
    expect(segments[1]?.label).toBe("Scene Two");
  });

  it("routes low-confidence extraction to needs_review", async () => {
    const llmClient = createConfiguredIngestionLlmClient({
      modelName: "test-model",
      extractor: async ({ sessionId, segmentId }) => ({
        candidates: [
          {
            candidateId: `${segmentId}:entity`,
            candidateKind: "entity",
            canonicalKey: "entity:alice",
            confidence: 0.6,
            sourceSpanStart: 0,
            sourceSpanEnd: 5,
            provenanceDetail: { sessionId },
            payload: {
              entityId: "character:alice",
              entityKind: "character",
              name: "Alice",
              aliases: [],
              description: "",
              archetypes: [],
              defaultLoyalties: []
            }
          }
        ]
      })
    });

    const submitted = await submitIngestionSession(
      {
        submissionKind: "chunk",
        text: "Alice wakes up.",
        draftTitle: "Draft"
      },
      {
        ingestionSessionRepository: repository,
        llmClient,
        generateId: () => "low-confidence",
        now: () => "2026-04-10T02:00:00Z"
      }
    );

    expect(submitted.session.workflowState).toBe("submitted");
    expect(submitted.segments).toHaveLength(1);

    const extracted = await extractIngestionSession(submitted.session.sessionId, {
      ingestionSessionRepository: repository,
      llmClient,
      generateId: () => "candidate-low-confidence",
      now: () => "2026-04-10T02:01:00Z"
    });

    expect(extracted.session.workflowState).toBe("needs_review");
    expect(extracted.segments[0]?.segment.workflowState).toBe("needs_review");
    expect(extracted.segments[0]?.candidates[0]?.reviewNeededReason).toBe("low_confidence");
  });
});
