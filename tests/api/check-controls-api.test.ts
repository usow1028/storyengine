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
import { buildImpossibleTravelFixture } from "../fixtures/hard-constraint-fixtures.js";
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

interface ScopedCheckSubmission {
  sessionId: string;
  storyId: string;
  revisionId: string;
  sections: Array<{ sectionId: string }>;
  segments: Array<{ segmentId: string }>;
  scopes: Array<{
    scopeId: string;
    scopeKind: string;
    sectionId?: string | null;
  }>;
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

async function prepareScopedCheckSession(input: {
  ingestionSessionRepository: IngestionSessionRepository;
  storyRepository: StoryRepository;
  ruleRepository: RuleRepository;
  firstSegmentStale?: boolean;
}): Promise<{
  submitted: ScopedCheckSubmission;
  fullScopeId: string;
  sectionScopeId: string;
}> {
  const fixture = buildImpossibleTravelFixture();
  const sessionId = "session:scoped-check-api";
  const firstSegmentId = `${sessionId}:segment:1`;
  const secondSegmentId = `${sessionId}:segment:2`;
  const firstSectionId = `draft-section:${sessionId}:1`;
  const secondSectionId = `draft-section:${sessionId}:2`;
  const fullScopeId = `scope:${sessionId}:full`;
  const firstSectionScopeId = `scope:${sessionId}:section:1`;

  await input.storyRepository.saveGraph(fixture.graph);
  for (const rule of fixture.availableRules) {
    if (rule.version) {
      await input.ruleRepository.saveRulePack(rule.metadata, rule.version);
    }
  }

  await input.ingestionSessionRepository.createSession({
    sessionId,
    storyId: fixture.graph.story.storyId,
    revisionId: fixture.graph.revision.revisionId,
    draftTitle: "Scoped Check API Draft",
    defaultRulePackName: fixture.graph.story.defaultRulePackName,
    inputKind: "full_draft",
    rawText: "Airport scene.\n\nMeeting scene.",
    workflowState: "approved",
    promptFamily: "phase11-test",
    modelName: "test-model",
    lastVerdictRunId: null,
    createdAt: "2026-04-11T08:25:00Z",
    updatedAt: "2026-04-11T08:25:00Z",
    lastCheckedAt: null
  });

  await input.ingestionSessionRepository.saveDraftPlan(sessionId, {
    document: {
      documentId: `draft-document:${sessionId}`,
      storyId: fixture.graph.story.storyId,
      title: "Scoped Check API Draft",
      createdAt: "2026-04-11T08:25:00Z",
      updatedAt: "2026-04-11T08:25:00Z"
    },
    revision: {
      draftRevisionId: `draft-revision:${sessionId}`,
      documentId: `draft-document:${sessionId}`,
      storyId: fixture.graph.story.storyId,
      revisionId: fixture.graph.revision.revisionId,
      basedOnDraftRevisionId: null,
      createdAt: "2026-04-11T08:25:00Z"
    },
    sections: [
      {
        sectionId: firstSectionId,
        draftRevisionId: `draft-revision:${sessionId}`,
        sectionKind: "chapter",
        sequence: 0,
        label: "Chapter One",
        sourceTextRef: {
          sourceKind: "ingestion_session_raw_text",
          sessionId,
          startOffset: 0,
          endOffset: 13,
          textNormalization: "lf"
        }
      },
      {
        sectionId: secondSectionId,
        draftRevisionId: `draft-revision:${sessionId}`,
        sectionKind: "chapter",
        sequence: 1,
        label: "Chapter Two",
        sourceTextRef: {
          sourceKind: "ingestion_session_raw_text",
          sessionId,
          startOffset: 15,
          endOffset: 28,
          textNormalization: "lf"
        }
      }
    ],
    segments: [
      {
        segment: {
          segmentId: firstSegmentId,
          sessionId,
          sequence: 0,
          label: "Airport scene",
          startOffset: 0,
          endOffset: 13,
          segmentText: "Airport scene.",
          draftRevisionId: `draft-revision:${sessionId}`,
          sectionId: firstSectionId,
          draftPath: {
            documentId: `draft-document:${sessionId}`,
            draftRevisionId: `draft-revision:${sessionId}`,
            sectionId: firstSectionId,
            segmentId: firstSegmentId,
            sequence: 0
          },
          sourceTextRef: {
            sourceKind: "ingestion_session_raw_text",
            sessionId,
            startOffset: 0,
            endOffset: 13,
            textNormalization: "lf"
          },
          workflowState: "approved",
          approvedAt: "2026-04-11T08:25:30Z",
          attemptCount: 0,
          lastExtractionAt: null,
          lastAttemptStatus: null,
          lastFailureSummary: null,
          stale: input.firstSegmentStale ?? false,
          staleReason: null,
          currentAttemptId: null
        },
        sourceTextRef: {
          sourceKind: "ingestion_session_raw_text",
          sessionId,
          startOffset: 0,
          endOffset: 13,
          textNormalization: "lf"
        },
        draftPath: {
          documentId: `draft-document:${sessionId}`,
          draftRevisionId: `draft-revision:${sessionId}`,
          sectionId: firstSectionId,
          segmentId: firstSegmentId,
          sequence: 0
        }
      },
      {
        segment: {
          segmentId: secondSegmentId,
          sessionId,
          sequence: 1,
          label: "Meeting scene",
          startOffset: 15,
          endOffset: 28,
          segmentText: "Meeting scene.",
          draftRevisionId: `draft-revision:${sessionId}`,
          sectionId: secondSectionId,
          draftPath: {
            documentId: `draft-document:${sessionId}`,
            draftRevisionId: `draft-revision:${sessionId}`,
            sectionId: secondSectionId,
            segmentId: secondSegmentId,
            sequence: 1
          },
          sourceTextRef: {
            sourceKind: "ingestion_session_raw_text",
            sessionId,
            startOffset: 15,
            endOffset: 28,
            textNormalization: "lf"
          },
          workflowState: "needs_review",
          approvedAt: null,
          attemptCount: 0,
          lastExtractionAt: null,
          lastAttemptStatus: null,
          lastFailureSummary: null,
          stale: false,
          staleReason: null,
          currentAttemptId: null
        },
        sourceTextRef: {
          sourceKind: "ingestion_session_raw_text",
          sessionId,
          startOffset: 15,
          endOffset: 28,
          textNormalization: "lf"
        },
        draftPath: {
          documentId: `draft-document:${sessionId}`,
          draftRevisionId: `draft-revision:${sessionId}`,
          sectionId: secondSectionId,
          segmentId: secondSegmentId,
          sequence: 1
        }
      }
    ],
    checkScopes: [
      {
        scopeKind: "full_approved_draft",
        scopeId: fullScopeId,
        documentId: `draft-document:${sessionId}`,
        draftRevisionId: `draft-revision:${sessionId}`,
        storyId: fixture.graph.story.storyId,
        revisionId: fixture.graph.revision.revisionId
      },
      {
        scopeKind: "section",
        scopeId: firstSectionScopeId,
        documentId: `draft-document:${sessionId}`,
        draftRevisionId: `draft-revision:${sessionId}`,
        sectionId: firstSectionId,
        sourceTextRef: {
          sourceKind: "ingestion_session_raw_text",
          sessionId,
          startOffset: 0,
          endOffset: 13,
          textNormalization: "lf"
        }
      }
    ],
    normalizedRawText: "Airport scene.\n\nMeeting scene."
  });

  await input.ingestionSessionRepository.saveSegments(sessionId, [
    {
      segmentId: firstSegmentId,
      sessionId,
      sequence: 0,
      label: "Airport scene",
      startOffset: 0,
      endOffset: 13,
      segmentText: "Airport scene.",
      draftRevisionId: `draft-revision:${sessionId}`,
      sectionId: firstSectionId,
      draftPath: {
        documentId: `draft-document:${sessionId}`,
        draftRevisionId: `draft-revision:${sessionId}`,
        sectionId: firstSectionId,
        segmentId: firstSegmentId,
        sequence: 0
      },
      sourceTextRef: {
        sourceKind: "ingestion_session_raw_text",
        sessionId,
        startOffset: 0,
        endOffset: 13,
        textNormalization: "lf"
      },
      workflowState: "approved",
      approvedAt: "2026-04-11T08:25:30Z",
      attemptCount: 0,
      lastExtractionAt: null,
      lastAttemptStatus: null,
      lastFailureSummary: null,
      stale: false,
      staleReason: null,
      currentAttemptId: null
    },
    {
      segmentId: secondSegmentId,
      sessionId,
      sequence: 1,
      label: "Meeting scene",
      startOffset: 15,
      endOffset: 28,
      segmentText: "Meeting scene.",
      draftRevisionId: `draft-revision:${sessionId}`,
      sectionId: secondSectionId,
      draftPath: {
        documentId: `draft-document:${sessionId}`,
        draftRevisionId: `draft-revision:${sessionId}`,
        sectionId: secondSectionId,
        segmentId: secondSegmentId,
        sequence: 1
      },
      sourceTextRef: {
        sourceKind: "ingestion_session_raw_text",
        sessionId,
        startOffset: 15,
        endOffset: 28,
        textNormalization: "lf"
      },
      workflowState: "needs_review",
      approvedAt: null,
      attemptCount: 0,
      lastExtractionAt: null,
      lastAttemptStatus: null,
      lastFailureSummary: null,
      stale: false,
      staleReason: null,
      currentAttemptId: null
    }
  ]);

  await input.ingestionSessionRepository.saveExtractionBatch({
    sessionId,
    segments: [
      {
        segmentId: firstSegmentId,
        workflowState: "approved",
        ...(input.firstSegmentStale
          ? {
              attempt: {
                attemptId: `${firstSegmentId}:attempt:1`,
                attemptNumber: 1,
                requestKind: "targeted_retry" as const,
                status: "success" as const,
                invalidatedApproval: true,
                startedAt: "2026-04-11T08:25:45Z",
                finishedAt: "2026-04-11T08:25:50Z",
                errorSummary: null
              }
            }
          : {}),
        candidates: [
          {
            candidateId: `${firstSegmentId}:event:airport`,
            sessionId,
            segmentId: firstSegmentId,
            candidateKind: "event",
            canonicalKey: "event:airport",
            confidence: 0.99,
            reviewNeeded: false,
            reviewNeededReason: null,
            sourceSpanStart: 0,
            sourceSpanEnd: 13,
            provenanceDetail: { source: "scoped-check-fixture" },
            extractedPayload: fixture.graph.events[0],
            correctedPayload: null,
            normalizedPayload: fixture.graph.events[0]
          }
        ]
      },
      {
        segmentId: secondSegmentId,
        workflowState: "needs_review",
        candidates: [
          {
            candidateId: `${secondSegmentId}:event:meeting`,
            sessionId,
            segmentId: secondSegmentId,
            candidateKind: "event",
            canonicalKey: "event:meeting",
            confidence: 0.99,
            reviewNeeded: false,
            reviewNeededReason: null,
            sourceSpanStart: 15,
            sourceSpanEnd: 28,
            provenanceDetail: { source: "scoped-check-fixture" },
            extractedPayload: fixture.graph.events[1],
            correctedPayload: null,
            normalizedPayload: fixture.graph.events[1]
          }
        ]
      }
    ]
  });

  return {
    submitted: {
      sessionId,
      storyId: fixture.graph.story.storyId,
      revisionId: fixture.graph.revision.revisionId,
      sections: [{ sectionId: firstSectionId }, { sectionId: secondSectionId }],
      segments: [{ segmentId: firstSegmentId }, { segmentId: secondSegmentId }],
      scopes: [
        {
          scopeId: fullScopeId,
          scopeKind: "full_approved_draft",
          sectionId: null
        },
        {
          scopeId: firstSectionScopeId,
          scopeKind: "section",
          sectionId: firstSectionId
        }
      ]
    },
    fullScopeId,
    sectionScopeId: firstSectionScopeId
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
      previousRunId: null,
      scopeId: null,
      comparisonScopeKey: null
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
      scopeId: null,
      comparisonScopeKey: null,
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

  it("blocks full-session check after retry reset until the reopened segment is reapproved", async () => {
    const llmClient = createConfiguredIngestionLlmClient({
      modelName: "test-model",
      extractor: async ({ segmentId, sessionId }) => {
        const name = segmentId.endsWith(":1") ? "Alice" : "Bob";
        return {
          candidates: [
            {
              candidateId: `${segmentId}:entity`,
              candidateKind: "entity",
              canonicalKey: `entity:${name.toLowerCase()}`,
              confidence: 0.94,
              sourceSpanStart: 0,
              sourceSpanEnd: name.length,
              provenanceDetail: { source: "api-test" },
              payload: correctedCharacterPayload(name, sessionId)
            }
          ]
        };
      }
    });

    const app = buildStoryGraphApi({
      ingestionSessionRepository: repository,
      storyRepository,
      ruleRepository,
      provenanceRepository,
      verdictRepository,
      verdictRunRepository,
      llmClient,
      generateId: () => "retry-reset-check",
      now: () => "2026-04-11T07:30:00Z"
    });

    const submitResponse = await app.inject({
      method: "POST",
      url: "/api/ingestion/submissions",
      payload: {
        sessionId: "session:retry-reset-check",
        submissionKind: "full_draft",
        text: "Alice waits.\n\nBob leaves.",
        draftTitle: "Retry Reset Check Draft"
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

    const firstApprove = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/segments/segment:session:retry-reset-check:1/approve`
    });
    const secondApprove = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/segments/segment:session:retry-reset-check:2/approve`
    });
    expect(firstApprove.statusCode).toBe(200);
    expect(secondApprove.statusCode).toBe(200);
    const untouchedApprovedAt = secondApprove.json().segments[1].approvedAt;

    const reopened = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/extract`,
      payload: {
        segmentIds: ["segment:session:retry-reset-check:1"],
        allowApprovalReset: true
      }
    });
    expect(reopened.statusCode).toBe(200);
    const reopenedPayload = reopened.json();
    expect(reopenedPayload.segments[0].approvedAt).toBeNull();
    expect(reopenedPayload.segments[0].stale).toBe(true);
    expect(reopenedPayload.segments[1].approvedAt).toBe(untouchedApprovedAt);

    const blockedCheck = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/check`
    });
    expect(blockedCheck.statusCode).toBe(409);
    expect(blockedCheck.json().message).toContain("every segment approved and current");

    const reapprove = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/segments/segment:session:retry-reset-check:1/approve`
    });
    expect(reapprove.statusCode).toBe(200);

    const finalCheck = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/check`
    });
    expect(finalCheck.statusCode).toBe(200);

    await app.close();
  });

  it("passes manual check only after the last reopened segment is reapproved", async () => {
    let failSegment2Once = false;
    const llmClient = createConfiguredIngestionLlmClient({
      modelName: "test-model",
      extractor: async ({ segmentId, sessionId }) => {
        if (failSegment2Once && segmentId.endsWith(":2")) {
          failSegment2Once = false;
          throw new Error("Segment 2 fails once during retry.");
        }

        const name = segmentId.endsWith(":1")
          ? "Alice"
          : segmentId.endsWith(":2")
            ? "Bob"
            : "Cara";
        return {
          candidates: [
            {
              candidateId: `${segmentId}:entity`,
              candidateKind: "entity",
              canonicalKey: `entity:${name.toLowerCase()}`,
              confidence: 0.94,
              sourceSpanStart: 0,
              sourceSpanEnd: name.length,
              provenanceDetail: { source: "api-test" },
              payload: correctedCharacterPayload(name, sessionId)
            }
          ]
        };
      }
    });

    const app = buildStoryGraphApi({
      ingestionSessionRepository: repository,
      storyRepository,
      ruleRepository,
      provenanceRepository,
      verdictRepository,
      verdictRunRepository,
      llmClient,
      generateId: () => "three-segment-check",
      now: () => "2026-04-11T08:00:00Z"
    });

    const submitResponse = await app.inject({
      method: "POST",
      url: "/api/ingestion/submissions",
      payload: {
        sessionId: "session:three-segment-check",
        submissionKind: "full_draft",
        text: "Alice waits.\n\nBob hesitates.\n\nCara returns.",
        draftTitle: "Three Segment Check Draft"
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

    for (const segmentId of [
      "segment:session:three-segment-check:1",
      "segment:session:three-segment-check:3"
    ]) {
      const approveResponse = await app.inject({
        method: "POST",
        url: `/api/ingestion/submissions/${submitted.sessionId}/segments/${segmentId}/approve`
      });
      expect(approveResponse.statusCode).toBe(200);
    }

    failSegment2Once = true;
    const failedRetry = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/extract`,
      payload: {
        segmentIds: ["segment:session:three-segment-check:2"],
        allowApprovalReset: true
      }
    });
    expect(failedRetry.statusCode).toBe(200);

    const recoveredRetry = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/extract`,
      payload: {
        segmentIds: ["segment:session:three-segment-check:2"],
        allowApprovalReset: true
      }
    });
    expect(recoveredRetry.statusCode).toBe(200);

    const approveSecond = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/segments/segment:session:three-segment-check:2/approve`
    });
    expect(approveSecond.statusCode).toBe(200);

    const reopenedThird = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/extract`,
      payload: {
        segmentIds: ["segment:session:three-segment-check:3"],
        allowApprovalReset: true
      }
    });
    expect(reopenedThird.statusCode).toBe(200);

    const blockedCheck = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/check`
    });
    expect(blockedCheck.statusCode).toBe(409);

    const reapproveThird = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/segments/segment:session:three-segment-check:3/approve`
    });
    expect(reapproveThird.statusCode).toBe(200);

    const finalCheck = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/check`
    });
    expect(finalCheck.statusCode).toBe(200);
    expect(finalCheck.json().workflowState).toBe("checked");

    await app.close();
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

  it("runs scoped checks for an approved section while another section stays unresolved", async () => {
    const llmClient = createConfiguredIngestionLlmClient({
      modelName: "test-model",
      extractor: async ({ segmentId, sessionId }) => {
        const name = segmentId.endsWith(":1") ? "Alice" : "Bob";
        return {
          candidates: [
            {
              candidateId: `${segmentId}:entity`,
              candidateKind: "entity",
              canonicalKey: `entity:${name.toLowerCase()}`,
              confidence: 0.94,
              sourceSpanStart: 0,
              sourceSpanEnd: name.length,
              provenanceDetail: { source: "api-test" },
              payload: correctedCharacterPayload(name, sessionId)
            }
          ]
        };
      }
    });

    const app = buildStoryGraphApi({
      ingestionSessionRepository: repository,
      storyRepository,
      ruleRepository,
      provenanceRepository,
      verdictRepository,
      verdictRunRepository,
      llmClient,
      generateId: () => "scoped-check-api",
      now: () => "2026-04-11T08:30:00Z"
    });

    const { submitted, sectionScopeId } = await prepareScopedCheckSession({
      ingestionSessionRepository: repository,
      storyRepository,
      ruleRepository
    });

    const checkResponse = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/check`,
      payload: {
        scopeId: sectionScopeId
      }
    });

    expect(checkResponse.statusCode).toBe(200);
    const checked = CheckIngestionResponseSchema.parse(checkResponse.json());
    expect(checked).toMatchObject({
      sessionId: submitted.sessionId,
      workflowState: "checked",
      storyId: submitted.storyId,
      revisionId: submitted.revisionId,
      previousRunId: null,
      scopeId: sectionScopeId,
      comparisonScopeKey: expect.stringContaining("section:")
    });
    expect(checked.softPrior).toMatchObject({
      status: "disabled",
      assessment: null,
      rerankedRepairs: [],
      repairPlausibilityAdjustments: []
    });

    await app.close();
  });

  it("returns 409 when a scoped check includes a stale segment", async () => {
    const llmClient = createConfiguredIngestionLlmClient({
      modelName: "test-model",
      extractor: async ({ segmentId, sessionId }) => {
        const name = segmentId.endsWith(":1") ? "Alice" : "Bob";
        return {
          candidates: [
            {
              candidateId: `${segmentId}:entity`,
              candidateKind: "entity",
              canonicalKey: `entity:${name.toLowerCase()}`,
              confidence: 0.94,
              sourceSpanStart: 0,
              sourceSpanEnd: name.length,
              provenanceDetail: { source: "api-test" },
              payload: correctedCharacterPayload(name, sessionId)
            }
          ]
        };
      }
    });

    const app = buildStoryGraphApi({
      ingestionSessionRepository: repository,
      storyRepository,
      ruleRepository,
      provenanceRepository,
      verdictRepository,
      verdictRunRepository,
      llmClient,
      generateId: () => "scoped-check-stale",
      now: () => "2026-04-11T08:35:00Z"
    });

    const { submitted, sectionScopeId } = await prepareScopedCheckSession({
      ingestionSessionRepository: repository,
      storyRepository,
      ruleRepository,
      firstSegmentStale: true
    });

    const staleRetry = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/extract`,
      payload: {
        segmentIds: [submitted.segments[0].segmentId],
        allowApprovalReset: true
      }
    });
    expect(staleRetry.statusCode).toBe(200);

    const blockedCheck = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/check`,
      payload: {
        scopeId: sectionScopeId
      }
    });

    expect(blockedCheck.statusCode).toBe(409);
    expect(blockedCheck.json().message).toContain("approved and current");

    await app.close();
  });

  it("keeps full-session check blocked when scopeId is omitted", async () => {
    const llmClient = createConfiguredIngestionLlmClient({
      modelName: "test-model",
      extractor: async ({ segmentId, sessionId }) => {
        const name = segmentId.endsWith(":1") ? "Alice" : "Bob";
        return {
          candidates: [
            {
              candidateId: `${segmentId}:entity`,
              candidateKind: "entity",
              canonicalKey: `entity:${name.toLowerCase()}`,
              confidence: 0.94,
              sourceSpanStart: 0,
              sourceSpanEnd: name.length,
              provenanceDetail: { source: "api-test" },
              payload: correctedCharacterPayload(name, sessionId)
            }
          ]
        };
      }
    });

    const app = buildStoryGraphApi({
      ingestionSessionRepository: repository,
      storyRepository,
      ruleRepository,
      provenanceRepository,
      verdictRepository,
      verdictRunRepository,
      llmClient,
      generateId: () => "full-session-check-blocked",
      now: () => "2026-04-11T08:40:00Z"
    });

    const { submitted } = await prepareScopedCheckSession({
      ingestionSessionRepository: repository,
      storyRepository,
      ruleRepository
    });

    const blockedCheck = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/check`
    });

    expect(blockedCheck.statusCode).toBe(409);
    expect(blockedCheck.json().message).toContain("every segment approved and current");
    expect(blockedCheck.body).not.toContain("comparisonScopeKey");

    await app.close();
  });
});
