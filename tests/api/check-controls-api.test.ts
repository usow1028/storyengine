import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import { buildStoryGraphApi } from "../../src/api/app.js";
import {
  CheckIngestionResponseSchema,
  ExtractSubmissionRequestSchema,
  ReviewSegmentPatchRequestSchema,
  SubmitIngestionRequestSchema
} from "../../src/api/schemas.js";
import {
  applyCanonicalSchema,
  IngestionSessionRepository,
  ProvenanceRepository,
  RuleRepository,
  StoryRepository,
  VerdictRepository,
  VerdictRunRepository
} from "../../src/storage/index.js";
import { createConfiguredIngestionLlmClient } from "../../src/services/ingestion-session.js";

function createTestClient() {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  return { pool };
}

function correctedCharacterPayload(name: string, sessionId: string) {
  return {
    entityId: `character:${name.toLowerCase()}`,
    storyId: `story:draft:${sessionId}`,
    revisionId: `revision:draft:${sessionId}`,
    entityKind: "character" as const,
    name,
    aliases: [],
    description: "",
    archetypes: [],
    defaultLoyalties: []
  };
}

async function countVerdictRuns(pool: Pool): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM verdict_runs`
  );
  return Number(result.rows[0]?.count ?? "0");
}

function expectNoRequestPriorConfigFields(parsed: Record<string, unknown>): void {
  expect(parsed).not.toHaveProperty("snapshotDir");
  expect(parsed).not.toHaveProperty("snapshotSet");
  expect(parsed).not.toHaveProperty("genreWeights");
  expect(parsed).not.toHaveProperty("worldProfile");
}

describe("ingestion check controls api", () => {
  let pool: Pool;
  let repository: IngestionSessionRepository;
  let storyRepository: StoryRepository;
  let ruleRepository: RuleRepository;
  let provenanceRepository: ProvenanceRepository;
  let verdictRepository: VerdictRepository;
  let verdictRunRepository: VerdictRunRepository;

  beforeEach(async () => {
    const created = createTestClient();
    pool = created.pool;
    await applyCanonicalSchema(pool);
    repository = new IngestionSessionRepository(pool);
    storyRepository = new StoryRepository(pool);
    ruleRepository = new RuleRepository(pool);
    provenanceRepository = new ProvenanceRepository(pool);
    verdictRepository = new VerdictRepository(pool);
    verdictRunRepository = new VerdictRunRepository(pool);
  });

  afterEach(async () => {
    await pool.end();
  });

  it("returns 409 before approval, runs checks only on explicit request, and returns checked with a runId", async () => {
    const llmClient = createConfiguredIngestionLlmClient({
      modelName: "test-model",
      extractor: async ({ segmentId }) => ({
        candidates: [
          {
            candidateId: `${segmentId}:entity`,
            candidateKind: "entity",
            canonicalKey: "entity:alice",
            confidence: 0.91,
            sourceSpanStart: 0,
            sourceSpanEnd: 5,
            provenanceDetail: { source: "api-test" },
            payload: { name: "Alice" }
          }
        ]
      })
    });

    const app = buildStoryGraphApi({
      ingestionSessionRepository: repository,
      storyRepository,
      ruleRepository,
      provenanceRepository,
      verdictRepository,
      verdictRunRepository,
      llmClient,
      generateId: () => "check-session",
      now: () => "2026-04-10T02:30:00Z"
    });

    const submitResponse = await app.inject({
      method: "POST",
      url: "/api/ingestion/submissions",
      payload: {
        submissionKind: "chunk",
        text: "Alice wakes up.",
        draftTitle: "Check Draft"
      }
    });
    const submitted = submitResponse.json();
    expect(await countVerdictRuns(pool)).toBe(0);

    const extractResponse = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/extract`,
      payload: {}
    });
    expect(extractResponse.statusCode).toBe(200);
    const extracted = extractResponse.json();
    expect(await countVerdictRuns(pool)).toBe(0);

    const preApprovalCheck = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/check`
    });
    expect(preApprovalCheck.statusCode).toBe(409);

    const patchResponse = await app.inject({
      method: "PATCH",
      url: `/api/ingestion/submissions/${submitted.sessionId}/segments/${submitted.segments[0].segmentId}`,
      payload: {
        candidateCorrections: [
          {
            candidateId: extracted.segments[0].candidates[0].candidateId,
            correctedPayload: correctedCharacterPayload("Alice", submitted.sessionId)
          }
        ]
      }
    });
    expect(patchResponse.statusCode).toBe(200);
    expect(await countVerdictRuns(pool)).toBe(0);

    const approveResponse = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/segments/${submitted.segments[0].segmentId}/approve`
    });
    expect(approveResponse.statusCode).toBe(200);
    expect(approveResponse.json().workflowState).toBe("approved");
    expect(await countVerdictRuns(pool)).toBe(0);

    const checkResponse = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/check`
    });

    expect(checkResponse.statusCode).toBe(200);
    const checked = checkResponse.json();
    expect(checked).toMatchObject({
      sessionId: submitted.sessionId,
      workflowState: "checked",
      storyId: submitted.storyId,
      revisionId: submitted.revisionId,
      previousRunId: null
    });
    expect(checked.workflowState).toBe("checked");
    expect(checked.runId).toContain("run:");
    expect(checked.softPrior).toMatchObject({
      status: "disabled",
      assessment: null,
      rerankedRepairs: [],
      repairPlausibilityAdjustments: []
    });
    expect(checked.softPrior.reason).toContain("disabled");
    expect(await countVerdictRuns(pool)).toBe(1);

    await app.close();
  });

  it("preserves soft-prior advisory responses without accepting request prior config fields", () => {
    const softPrior = {
      status: "missing_snapshot" as const,
      reason: "No prior snapshot source configured.",
      assessment: null,
      rerankedRepairs: [],
      repairPlausibilityAdjustments: []
    };
    const parsedResponse = CheckIngestionResponseSchema.parse({
      sessionId: "session:checked",
      workflowState: "checked",
      storyId: "story:checked",
      revisionId: "revision:checked",
      runId: "run:checked",
      previousRunId: null,
      softPrior
    });

    expect(parsedResponse.softPrior).toEqual(softPrior);

    const submit = SubmitIngestionRequestSchema.parse({
      submissionKind: "chunk",
      text: "Alice enters.",
      draftTitle: "Prior Field Check",
      snapshotDir: "/tmp/not-trusted",
      snapshotSet: {},
      genreWeights: [{ genreKey: "fantasy", weight: 1 }],
      worldProfile: "fantasy-light"
    });
    const extract = ExtractSubmissionRequestSchema.parse({
      snapshotDir: "/tmp/not-trusted",
      snapshotSet: {},
      genreWeights: [{ genreKey: "fantasy", weight: 1 }],
      worldProfile: "fantasy-light"
    });
    const patch = ReviewSegmentPatchRequestSchema.parse({
      boundary: { label: "Scene" },
      snapshotDir: "/tmp/not-trusted",
      snapshotSet: {},
      genreWeights: [{ genreKey: "fantasy", weight: 1 }],
      worldProfile: "fantasy-light"
    });

    expectNoRequestPriorConfigFields(submit);
    expectNoRequestPriorConfigFields(extract);
    expectNoRequestPriorConfigFields(patch);
  });
});
