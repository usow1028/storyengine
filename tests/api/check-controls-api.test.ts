import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import { buildStoryGraphApi } from "../../src/api/app.js";
import {
  CheckIngestionResponseSchema,
  type CheckIngestionResponse,
  ExtractSubmissionRequestSchema,
  ReviewSegmentPatchRequestSchema,
  SubmitIngestionRequestSchema
} from "../../src/api/schemas.js";
import type { VerdictRecord, VerdictRunRecord } from "../../src/domain/index.js";
import { CanonicalEventSchema } from "../../src/domain/events.js";
import type { PriorSnapshotSet } from "../../src/engine/index.js";
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
import type { SoftPriorRuntimeConfig } from "../../src/services/soft-prior-runtime.js";
import { buildSoftPriorCheckCandidates } from "../fixtures/soft-prior-ingestion-fixtures.js";
import { buildSoftPriorArtifactsFixture } from "../fixtures/soft-prior-fixtures.js";

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

function eventTokenParts(event: ReturnType<typeof CanonicalEventSchema.parse>): string[] {
  return event.effects.flatMap((effect) => [
    ...effect.stateChanges.map(
      (change) => `${change.field}:${change.operation}:${String(change.value)}`
    ),
    ...effect.ruleChanges.map((change) => change.ruleVersionId)
  ]);
}

function buildApiSoftPriorSnapshotSet(): PriorSnapshotSet {
  const fixture = buildSoftPriorArtifactsFixture();

  return {
    snapshotDir: "fixture:api-soft-prior",
    baselineSnapshots:
      fixture.artifacts.find((artifact) => artifact.artifact.layer === "baseline")?.artifact
        .snapshots ?? [],
    genreSnapshots: fixture.artifacts
      .filter((artifact) => artifact.artifact.layer === "genre")
      .flatMap((artifact) => artifact.artifact.snapshots)
  };
}

function hardVerdictProjection(verdicts: VerdictRecord[]) {
  return verdicts.map((verdict) => ({
    verdictKind: verdict.verdictKind,
    category: verdict.category,
    findingId: verdict.evidence.findingId,
    reasonCode: verdict.evidence.reasonCode,
    eventIds: verdict.evidence.eventIds,
    createdAt: verdict.createdAt
  }));
}

function runMetadataProjection(runs: VerdictRunRecord[]) {
  return runs.map((run) => ({
    previousRunId: run.previousRunId ?? null,
    triggerKind: run.triggerKind,
    createdAt: run.createdAt
  }));
}

async function runSoftPriorCheckFlow(input: {
  softPriorConfig: SoftPriorRuntimeConfig;
}): Promise<{
  checked: CheckIngestionResponse;
  persistedVerdicts: VerdictRecord[];
  persistedRuns: VerdictRunRecord[];
}> {
  const created = createTestClient();
  const pool = created.pool;
  await applyCanonicalSchema(pool);
  const repository = new IngestionSessionRepository(pool);
  const storyRepository = new StoryRepository(pool);
  const ruleRepository = new RuleRepository(pool);
  const provenanceRepository = new ProvenanceRepository(pool);
  const verdictRepository = new VerdictRepository(pool);
  const verdictRunRepository = new VerdictRunRepository(pool);
  const llmClient = createConfiguredIngestionLlmClient({
    modelName: "test-model",
    extractor: async ({ sessionId, segmentId }) => ({
      candidates: buildSoftPriorCheckCandidates(sessionId, segmentId)
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
    softPriorConfig: input.softPriorConfig,
    generateId: () => "soft-prior-check",
    now: () => "2026-04-10T03:30:00Z"
  });

  try {
    const submitResponse = await app.inject({
      method: "POST",
      url: "/api/ingestion/submissions",
      payload: {
        submissionKind: "chunk",
        text: "The mage casts a gate spell in the ruins and arrives at the castle instantly.",
        draftTitle: "Soft Prior Draft",
        defaultRulePackName: "fantasy-light"
      }
    });
    expect(submitResponse.statusCode).toBe(201);
    const submitted = submitResponse.json();
    const segmentId = submitted.segments[0].segmentId;

    const extractResponse = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/extract`,
      payload: {}
    });
    expect(extractResponse.statusCode).toBe(200);

    const patchResponse = await app.inject({
      method: "PATCH",
      url: `/api/ingestion/submissions/${submitted.sessionId}/segments/${segmentId}`,
      payload: {
        boundary: {
          label: "Soft Prior Scene"
        }
      }
    });
    expect(patchResponse.statusCode).toBe(200);
    expect(patchResponse.json().segments[0].label).toBe("Soft Prior Scene");

    const approveResponse = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/segments/${segmentId}/approve`
    });
    expect(approveResponse.statusCode).toBe(200);
    expect(approveResponse.json().workflowState).toBe("approved");

    const checkResponse = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/check`
    });
    expect(checkResponse.statusCode).toBe(200);
    const checked = CheckIngestionResponseSchema.parse(checkResponse.json());
    const persistedVerdicts = await verdictRepository.listForRun(checked.runId);
    const persistedRuns = await verdictRunRepository.listRunsForRevision(
      checked.storyId,
      checked.revisionId
    );

    return {
      checked,
      persistedVerdicts,
      persistedRuns
    };
  } finally {
    await app.close();
    await pool.end();
  }
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

  it("builds soft-prior ingestion candidates for the advisory check flow", () => {
    const candidates = buildSoftPriorCheckCandidates(
      "session:soft-prior",
      "segment:soft-prior"
    );
    const events = candidates
      .filter((candidate) => candidate.candidateKind === "event")
      .map((candidate) => CanonicalEventSchema.parse(candidate.payload));

    expect(events.length).toBeGreaterThanOrEqual(2);

    const spell = events.find((event) => event.eventType === "spell_cast");
    const arrival = events.find((event) => event.eventType === "instant_arrival");

    expect(spell).toBeDefined();
    expect(arrival).toBeDefined();
    expect(arrival).toMatchObject({
      time: {
        relation: "same-window",
        durationMinutes: 0,
        minTravelMinutes: 480
      },
      placeId: "place:castle"
    });

    const tokens = events.flatMap((event) => eventTokenParts(event));
    expect(tokens).toContain("resources:remove:mana_reserve");
    expect(tokens).toContain("locationId:set:place:castle");
    expect(tokens).toContain("teleportation_enabled");
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

  it("returns available soft-prior advisory output without mutating hard verdicts through submit extract review approve check", async () => {
    const snapshotSet = buildApiSoftPriorSnapshotSet();
    const disabled = await runSoftPriorCheckFlow({
      softPriorConfig: { enabled: false }
    });
    const enabled = await runSoftPriorCheckFlow({
      softPriorConfig: {
        enabled: true,
        snapshotSet,
        genreWeights: [
          { genreKey: "fantasy", weight: 0.8 },
          { genreKey: "adventure", weight: 0.2 }
        ],
        worldProfile: "fantasy-light"
      }
    });

    expect(enabled.checked).toMatchObject({
      sessionId: "session:soft-prior-check",
      workflowState: "checked",
      storyId: "story:draft:session:soft-prior-check",
      revisionId: "revision:draft:session:soft-prior-check",
      previousRunId: null
    });
    expect(enabled.checked.runId).toContain("run:");
    expect(enabled.checked.softPrior.status).toBe("available");

    if (enabled.checked.softPrior.status !== "available") {
      throw new Error("Expected available soft-prior advisory output.");
    }

    expect(enabled.checked.softPrior.assessment.driftScores.transition_drift).toEqual(
      expect.any(Number)
    );
    expect(enabled.checked.softPrior.assessment.thresholds.transition_drift).toEqual(
      expect.any(Number)
    );
    expect(enabled.checked.softPrior.assessment.triggeredDrifts.length).toBeGreaterThan(0);
    expect(enabled.checked.softPrior.assessment.dominantPriorLayer).toBeDefined();
    expect(enabled.checked.softPrior.assessment.representativePatternSummary).toEqual(
      expect.any(String)
    );
    expect(enabled.checked.softPrior.assessment.contributions.length).toBeGreaterThan(0);
    expect(enabled.checked.softPrior.rerankedRepairs.length).toBeGreaterThan(0);
    expect(enabled.checked.softPrior.repairPlausibilityAdjustments.length).toBeGreaterThan(0);

    expect(disabled.checked.softPrior.status).toBe("disabled");
    expect(hardVerdictProjection(enabled.persistedVerdicts)).toEqual(
      hardVerdictProjection(disabled.persistedVerdicts)
    );
    expect(runMetadataProjection(enabled.persistedRuns)).toEqual(
      runMetadataProjection(disabled.persistedRuns)
    );
    expect(
      hardVerdictProjection(enabled.persistedVerdicts).some(
        (verdict) => verdict.verdictKind === "Hard Contradiction"
      )
    ).toBe(true);
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

  it("does not require scope input for existing approved chunk checks", async () => {
    const llmClient = createConfiguredIngestionLlmClient({
      modelName: "test-model",
      extractor: async ({ segmentId }) => ({
        candidates: [
          {
            candidateId: `${segmentId}:entity`,
            candidateKind: "entity",
            canonicalKey: "entity:alice",
            confidence: 0.94,
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
      generateId: () => "chunk-check-scope",
      now: () => "2026-04-11T03:57:00Z"
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
    expect(submitResponse.statusCode).toBe(201);
    const submitted = submitResponse.json();

    const extractResponse = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/extract`,
      payload: {}
    });
    expect(extractResponse.statusCode).toBe(200);
    const extracted = extractResponse.json();

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

    const approveResponse = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/segments/${submitted.segments[0].segmentId}/approve`
    });
    expect(approveResponse.statusCode).toBe(200);
    expect(approveResponse.json().workflowState).toBe("approved");

    const checkResponse = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/check`
    });
    expect(checkResponse.statusCode).toBe(200);
    expect(checkResponse.json().workflowState).toBe("checked");

    await app.close();
  });
});
