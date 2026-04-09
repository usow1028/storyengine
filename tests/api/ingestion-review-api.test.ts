import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import { buildStoryGraphApi } from "../../src/api/app.js";
import { applyCanonicalSchema, IngestionSessionRepository } from "../../src/storage/index.js";
import { createConfiguredIngestionLlmClient } from "../../src/services/ingestion-session.js";

function createTestClient() {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  return { pool };
}

describe("ingestion review api", () => {
  let pool: Pool;
  let repository: IngestionSessionRepository;

  beforeEach(async () => {
    const created = createTestClient();
    pool = created.pool;
    await applyCanonicalSchema(pool);
    repository = new IngestionSessionRepository(pool);
  });

  afterEach(async () => {
    await pool.end();
  });

  it("supports submit -> extract -> read with explicit workflow states", async () => {
    const llmClient = createConfiguredIngestionLlmClient({
      modelName: "test-model",
      extractor: async ({ segmentId }) => ({
        candidates: [
          {
            candidateId: `${segmentId}:entity`,
            candidateKind: "entity",
            canonicalKey: "entity:alice",
            confidence: 0.95,
            sourceSpanStart: 0,
            sourceSpanEnd: 5,
            provenanceDetail: { source: "api-test" },
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

    const app = buildStoryGraphApi({
      ingestionSessionRepository: repository,
      llmClient,
      generateId: () => "api-session",
      now: () => "2026-04-10T02:00:00Z"
    });

    const submitResponse = await app.inject({
      method: "POST",
      url: "/api/ingestion/submissions",
      payload: {
        submissionKind: "chunk",
        text: "Alice wakes up.",
        draftTitle: "API Draft"
      }
    });

    expect(submitResponse.statusCode).toBe(201);
    const submitted = submitResponse.json();
    expect(submitted.workflowState).toBe("submitted");
    expect(submitted.segments).toHaveLength(1);

    const extractResponse = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/extract`,
      payload: {}
    });

    expect(extractResponse.statusCode).toBe(200);
    const extracted = extractResponse.json();
    expect(extracted.workflowState).toBe("extracted");
    expect(extracted.segments[0].candidates[0].reviewNeeded).toBe(false);

    const readResponse = await app.inject({
      method: "GET",
      url: `/api/ingestion/submissions/${submitted.sessionId}`
    });

    expect(readResponse.statusCode).toBe(200);
    const readPayload = readResponse.json();
    expect(readPayload.workflowState).toBe("extracted");
    expect(readPayload.segments[0].candidates[0].canonicalKey).toBe("entity:alice");

    await app.close();
  });
});
