import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import { buildStoryGraphApi } from "../../src/api/app.js";
import { RunInspectionResponseSchema } from "../../src/api/schemas.js";
import type {
  RunInspectionSnapshot,
  VerdictRecord,
  VerdictRunScope
} from "../../src/domain/index.js";
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
import { buildImpossibleTravelFixture } from "../fixtures/hard-constraint-fixtures.js";

function createTestClient() {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  return { pool };
}

function createSourceTextRef(sessionId: string, startOffset: number, endOffset: number) {
  return {
    sourceKind: "ingestion_session_raw_text" as const,
    sessionId,
    startOffset,
    endOffset,
    textNormalization: "lf" as const
  };
}

function hardVerdict(): VerdictRecord {
  return {
    verdictId: "verdict:api-hard",
    runId: "run:api-current",
    storyId: "story:test",
    revisionId: "revision:test",
    verdictKind: "Hard Contradiction",
    category: "temporal_contradiction",
    explanation: "A character cannot cross the ocean instantly.",
    evidence: {
      findingId: "finding:api-hard",
      representativeChecker: "time",
      reasonCode: "impossible_travel",
      eventIds: ["event:airport", "event:meeting"],
      stateBoundaryIds: ["boundary:a"],
      ruleVersionIds: ["ruleversion:reality"],
      provenanceIds: ["provenance:api-hard"],
      eventSummaries: [
        {
          eventId: "event:airport",
          eventType: "airport",
          sequence: 1,
          abstract: false,
          placeId: "place:seoul",
          actorIds: ["character:a"],
          targetIds: [],
          timeRelation: "after"
        },
        {
          eventId: "event:meeting",
          eventType: "meeting",
          sequence: 2,
          abstract: false,
          placeId: "place:newyork",
          actorIds: ["character:a"],
          targetIds: [],
          timeRelation: "same-window"
        }
      ],
      stateSummaries: [],
      ruleSummaries: [],
      conflictPath: ["event:airport", "event:meeting"],
      missingPremises: [],
      supportingFindings: [],
      notEvaluated: []
    },
    createdAt: "2026-04-10T11:00:00Z"
  };
}

function inspectionSnapshot(): RunInspectionSnapshot {
  const repair = {
    repairId: "repair:api-bridge",
    repairType: "add_prior_event" as const,
    reasonCode: "impossible_travel",
    sourceFindingIds: ["finding:api-hard"],
    confidenceBand: "high" as const,
    summary: "Add an explicit flight before the meeting.",
    payload: {
      insertBeforeEventId: "event:meeting",
      anchorEventId: "event:airport",
      eventType: "flight",
      summary: "The character takes a flight.",
      expectedEffect: "Travel becomes possible."
    }
  };

  return {
    runId: "run:api-current",
    createdAt: "2026-04-10T11:00:00Z",
    repairCandidates: [repair],
    advisory: {
      status: "available",
      assessment: {
        driftScores: {
          transition_drift: 0.62,
          motivation_drift: 0.1,
          rule_exception_rarity: 0.2
        },
        thresholds: {
          transition_drift: 0.5,
          motivation_drift: 0.5,
          rule_exception_rarity: 0.5
        },
        dominantPriorLayer: "baseline",
        triggeredDrifts: ["transition_drift"],
        representativePatternSummary: "Long travel needs setup.",
        contributions: [
          {
            layer: "baseline",
            genreKey: "baseline",
            worldProfile: "reality-default",
            driftType: "transition_drift",
            sampleCount: 9,
            confidence: 0.75,
            appliedWeight: 1,
            score: 0.62,
            threshold: 0.5,
            representativePatternSummary: "Long travel needs setup."
          }
        ]
      },
      rerankedRepairs: [repair],
      repairPlausibilityAdjustments: [
        {
          repairId: "repair:api-bridge",
          adjustment: 0.2,
          confidence: 0.75,
          dominantPriorLayer: "baseline",
          representativePatternSummary: "Long travel needs setup."
        }
      ]
    },
    operationalSummary: {
      workflowState: "partial_failure",
      totalSegmentCount: 4,
      approvedSegmentCount: 2,
      staleSegmentCount: 1,
      unresolvedSegmentCount: 1,
      failedSegmentCount: 1,
      warningCount: 3,
      warningKinds: ["stale_segments", "unresolved_segments", "failed_segments"]
    }
  };
}

function fullInspectionScope(input: {
  scopeId: string;
  storyId: string;
  revisionId: string;
  documentId: string;
  draftRevisionId: string;
}): VerdictRunScope {
  return {
    scopeId: input.scopeId,
    scopeKind: "full_approved_draft",
    comparisonScopeKey: `full:${input.documentId}`,
    segmentIds: ["segment:inspection:1", "segment:inspection:2"],
    eventIds: ["event:airport", "event:meeting"],
    sourceTextRefs: [
      {
        sourceKind: "ingestion_session_raw_text",
        sessionId: "session:inspection",
        startOffset: 0,
        endOffset: 28,
        textNormalization: "lf"
      }
    ],
    payload: {
      scopeKind: "full_approved_draft",
      scopeId: input.scopeId,
      documentId: input.documentId,
      draftRevisionId: input.draftRevisionId,
      storyId: input.storyId,
      revisionId: input.revisionId
    }
  };
}

describe("inspection api", () => {
  let pool: Pool;
  let storyRepository: StoryRepository;
  let verdictRepository: VerdictRepository;
  let verdictRunRepository: VerdictRunRepository;
  let ingestionSessionRepository: IngestionSessionRepository;
  let provenanceRepository: ProvenanceRepository;

  beforeEach(async () => {
    const created = createTestClient();
    pool = created.pool;
    await applyCanonicalSchema(pool);

    storyRepository = new StoryRepository(pool);
    verdictRepository = new VerdictRepository(pool);
    verdictRunRepository = new VerdictRunRepository(pool);
    ingestionSessionRepository = new IngestionSessionRepository(pool);
    provenanceRepository = new ProvenanceRepository(pool);

    await storyRepository.saveGraph(buildImpossibleTravelFixture().graph);
    await ingestionSessionRepository.createSession({
      sessionId: "session:inspection",
      storyId: "story:test",
      revisionId: "revision:test",
      draftTitle: "Inspection API Draft",
      defaultRulePackName: "reality-default",
      inputKind: "full_draft",
      rawText: "Arrival beat 1.\nArrival beat 2.\nReview beat.\nFailed beat.",
      workflowState: "partial_failure",
      promptFamily: "phase12-test",
      modelName: "test-model",
      lastVerdictRunId: null,
      createdAt: "2026-04-10T10:55:00Z",
      updatedAt: "2026-04-10T11:00:00Z",
      lastCheckedAt: null
    });
    await ingestionSessionRepository.saveDraftPlan("session:inspection", {
      document: {
        documentId: "draft-document:api-inspection",
        storyId: "story:test",
        title: "Inspection API Draft",
        createdAt: "2026-04-10T10:55:00Z",
        updatedAt: "2026-04-10T11:00:00Z"
      },
      revision: {
        draftRevisionId: "draft-revision:api-inspection",
        documentId: "draft-document:api-inspection",
        storyId: "story:test",
        revisionId: "revision:test",
        basedOnDraftRevisionId: null,
        createdAt: "2026-04-10T10:55:00Z"
      },
      sections: [
        {
          sectionId: "draft-section:api-inspection:chapter-1",
          draftRevisionId: "draft-revision:api-inspection",
          sectionKind: "chapter",
          sequence: 0,
          label: "Chapter 1",
          sourceTextRef: createSourceTextRef("session:inspection", 0, 112)
        }
      ],
      segments: [
        {
          segment: {
            segmentId: "segment:inspection:1",
            sessionId: "session:inspection",
            sequence: 0,
            label: "Arrival beat 1",
            startOffset: 0,
            endOffset: 28,
            segmentText: "Arrival beat 1.",
            draftRevisionId: "draft-revision:api-inspection",
            sectionId: "draft-section:api-inspection:chapter-1",
            draftPath: {
              documentId: "draft-document:api-inspection",
              draftRevisionId: "draft-revision:api-inspection",
              sectionId: "draft-section:api-inspection:chapter-1",
              segmentId: "segment:inspection:1",
              sequence: 0
            },
            sourceTextRef: createSourceTextRef("session:inspection", 0, 28),
            workflowState: "approved",
            approvedAt: "2026-04-10T10:56:00Z",
            attemptCount: 0,
            lastExtractionAt: null,
            lastAttemptStatus: null,
            lastFailureSummary: null,
            stale: true,
            staleReason: "review_patch",
            currentAttemptId: null
          },
          sourceTextRef: createSourceTextRef("session:inspection", 0, 28),
          draftPath: {
            documentId: "draft-document:api-inspection",
            draftRevisionId: "draft-revision:api-inspection",
            sectionId: "draft-section:api-inspection:chapter-1",
            segmentId: "segment:inspection:1",
            sequence: 0
          }
        },
        {
          segment: {
            segmentId: "segment:inspection:2",
            sessionId: "session:inspection",
            sequence: 1,
            label: "Arrival beat 2",
            startOffset: 29,
            endOffset: 56,
            segmentText: "Arrival beat 2.",
            draftRevisionId: "draft-revision:api-inspection",
            sectionId: "draft-section:api-inspection:chapter-1",
            draftPath: {
              documentId: "draft-document:api-inspection",
              draftRevisionId: "draft-revision:api-inspection",
              sectionId: "draft-section:api-inspection:chapter-1",
              segmentId: "segment:inspection:2",
              sequence: 1
            },
            sourceTextRef: createSourceTextRef("session:inspection", 29, 56),
            workflowState: "approved",
            approvedAt: "2026-04-10T10:57:00Z",
            attemptCount: 0,
            lastExtractionAt: null,
            lastAttemptStatus: null,
            lastFailureSummary: null,
            stale: false,
            staleReason: null,
            currentAttemptId: null
          },
          sourceTextRef: createSourceTextRef("session:inspection", 29, 56),
          draftPath: {
            documentId: "draft-document:api-inspection",
            draftRevisionId: "draft-revision:api-inspection",
            sectionId: "draft-section:api-inspection:chapter-1",
            segmentId: "segment:inspection:2",
            sequence: 1
          }
        },
        {
          segment: {
            segmentId: "segment:inspection:3",
            sessionId: "session:inspection",
            sequence: 2,
            label: "Review beat",
            startOffset: 57,
            endOffset: 84,
            segmentText: "Review beat.",
            draftRevisionId: "draft-revision:api-inspection",
            sectionId: "draft-section:api-inspection:chapter-1",
            draftPath: {
              documentId: "draft-document:api-inspection",
              draftRevisionId: "draft-revision:api-inspection",
              sectionId: "draft-section:api-inspection:chapter-1",
              segmentId: "segment:inspection:3",
              sequence: 2
            },
            sourceTextRef: createSourceTextRef("session:inspection", 57, 84),
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
          sourceTextRef: createSourceTextRef("session:inspection", 57, 84),
          draftPath: {
            documentId: "draft-document:api-inspection",
            draftRevisionId: "draft-revision:api-inspection",
            sectionId: "draft-section:api-inspection:chapter-1",
            segmentId: "segment:inspection:3",
            sequence: 2
          }
        },
        {
          segment: {
            segmentId: "segment:inspection:4",
            sessionId: "session:inspection",
            sequence: 3,
            label: "Failed beat",
            startOffset: 85,
            endOffset: 112,
            segmentText: "Failed beat.",
            draftRevisionId: "draft-revision:api-inspection",
            sectionId: "draft-section:api-inspection:chapter-1",
            draftPath: {
              documentId: "draft-document:api-inspection",
              draftRevisionId: "draft-revision:api-inspection",
              sectionId: "draft-section:api-inspection:chapter-1",
              segmentId: "segment:inspection:4",
              sequence: 3
            },
            sourceTextRef: createSourceTextRef("session:inspection", 85, 112),
            workflowState: "failed",
            approvedAt: null,
            attemptCount: 1,
            lastExtractionAt: "2026-04-10T10:58:00Z",
            lastAttemptStatus: "failed",
            lastFailureSummary: "LLM extraction failed",
            stale: false,
            staleReason: null,
            currentAttemptId: "attempt:inspection:4:1"
          },
          sourceTextRef: createSourceTextRef("session:inspection", 85, 112),
          draftPath: {
            documentId: "draft-document:api-inspection",
            draftRevisionId: "draft-revision:api-inspection",
            sectionId: "draft-section:api-inspection:chapter-1",
            segmentId: "segment:inspection:4",
            sequence: 3
          }
        }
      ],
      checkScopes: [
        {
          scopeKind: "full_approved_draft",
          scopeId: "scope:api-current",
          documentId: "draft-document:api-inspection",
          draftRevisionId: "draft-revision:api-inspection",
          storyId: "story:test",
          revisionId: "revision:test"
        }
      ],
      normalizedRawText: "Arrival beat 1.\nArrival beat 2.\nReview beat.\nFailed beat."
    });
    await ingestionSessionRepository.saveSegments("session:inspection", [
      {
        segmentId: "segment:inspection:1",
        sessionId: "session:inspection",
        sequence: 0,
        label: "Arrival beat 1",
        startOffset: 0,
        endOffset: 28,
        segmentText: "Arrival beat 1.",
        draftRevisionId: "draft-revision:api-inspection",
        sectionId: "draft-section:api-inspection:chapter-1",
        draftPath: {
          documentId: "draft-document:api-inspection",
          draftRevisionId: "draft-revision:api-inspection",
          sectionId: "draft-section:api-inspection:chapter-1",
          segmentId: "segment:inspection:1",
          sequence: 0
        },
        sourceTextRef: createSourceTextRef("session:inspection", 0, 28),
        workflowState: "approved",
        approvedAt: "2026-04-10T10:56:00Z",
        attemptCount: 0,
        lastExtractionAt: null,
        lastAttemptStatus: null,
        lastFailureSummary: null,
        stale: true,
        staleReason: "review_patch",
        currentAttemptId: null
      },
      {
        segmentId: "segment:inspection:2",
        sessionId: "session:inspection",
        sequence: 1,
        label: "Arrival beat 2",
        startOffset: 29,
        endOffset: 56,
        segmentText: "Arrival beat 2.",
        draftRevisionId: "draft-revision:api-inspection",
        sectionId: "draft-section:api-inspection:chapter-1",
        draftPath: {
          documentId: "draft-document:api-inspection",
          draftRevisionId: "draft-revision:api-inspection",
          sectionId: "draft-section:api-inspection:chapter-1",
          segmentId: "segment:inspection:2",
          sequence: 1
        },
        sourceTextRef: createSourceTextRef("session:inspection", 29, 56),
        workflowState: "approved",
        approvedAt: "2026-04-10T10:57:00Z",
        attemptCount: 0,
        lastExtractionAt: null,
        lastAttemptStatus: null,
        lastFailureSummary: null,
        stale: false,
        staleReason: null,
        currentAttemptId: null
      },
      {
        segmentId: "segment:inspection:3",
        sessionId: "session:inspection",
        sequence: 2,
        label: "Review beat",
        startOffset: 57,
        endOffset: 84,
        segmentText: "Review beat.",
        draftRevisionId: "draft-revision:api-inspection",
        sectionId: "draft-section:api-inspection:chapter-1",
        draftPath: {
          documentId: "draft-document:api-inspection",
          draftRevisionId: "draft-revision:api-inspection",
          sectionId: "draft-section:api-inspection:chapter-1",
          segmentId: "segment:inspection:3",
          sequence: 2
        },
        sourceTextRef: createSourceTextRef("session:inspection", 57, 84),
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
      {
        segmentId: "segment:inspection:4",
        sessionId: "session:inspection",
        sequence: 3,
        label: "Failed beat",
        startOffset: 85,
        endOffset: 112,
        segmentText: "Failed beat.",
        draftRevisionId: "draft-revision:api-inspection",
        sectionId: "draft-section:api-inspection:chapter-1",
        draftPath: {
          documentId: "draft-document:api-inspection",
          draftRevisionId: "draft-revision:api-inspection",
          sectionId: "draft-section:api-inspection:chapter-1",
          segmentId: "segment:inspection:4",
          sequence: 3
        },
        sourceTextRef: createSourceTextRef("session:inspection", 85, 112),
        workflowState: "failed",
        approvedAt: null,
        attemptCount: 1,
        lastExtractionAt: "2026-04-10T10:58:00Z",
        lastAttemptStatus: "failed",
        lastFailureSummary: "LLM extraction failed",
        stale: false,
        staleReason: null,
        currentAttemptId: "attempt:inspection:4:1"
      }
    ]);
    await pool.query(
      `
        UPDATE ingestion_segments
        SET stale = CASE WHEN segment_id = 'segment:inspection:1' THEN TRUE ELSE FALSE END,
            stale_reason = CASE
              WHEN segment_id = 'segment:inspection:1' THEN 'review_patch'
              ELSE NULL
            END,
            attempt_count = CASE
              WHEN segment_id = 'segment:inspection:4' THEN 1
              ELSE 0
            END,
            last_extraction_at = CASE
              WHEN segment_id = 'segment:inspection:4' THEN '2026-04-10T10:58:00Z'
              ELSE NULL
            END,
            last_attempt_status = CASE
              WHEN segment_id = 'segment:inspection:4' THEN 'failed'
              ELSE NULL
            END,
            last_failure_summary = CASE
              WHEN segment_id = 'segment:inspection:4' THEN 'LLM extraction failed'
              ELSE NULL
            END,
            current_attempt_id = CASE
              WHEN segment_id = 'segment:inspection:4' THEN 'attempt:inspection:4:1'
              ELSE NULL
            END
        WHERE session_id = 'session:inspection'
      `
    );
    await provenanceRepository.saveMany([
      {
        provenanceId: "provenance:api-hard",
        ownerType: "verdict",
        ownerId: "verdict:api-hard",
        sourceKind: "normalized",
        sourceRef: "segment:inspection:1",
        detail: {
          sessionId: "session:inspection",
          segmentId: "segment:inspection:1",
          sourceSpanStart: 0,
          sourceSpanEnd: 28
        }
      }
    ]);
    await verdictRunRepository.saveRun({
      runId: "run:api-current",
      storyId: "story:test",
      revisionId: "revision:test",
      triggerKind: "test",
      createdAt: "2026-04-10T11:00:00Z",
      scope: fullInspectionScope({
        scopeId: "scope:api-current",
        storyId: "story:test",
        revisionId: "revision:test",
        documentId: "draft-document:api-inspection",
        draftRevisionId: "draft-revision:api-inspection"
      })
    });
    await verdictRepository.saveVerdict(hardVerdict());
    await verdictRunRepository.saveInspectionSnapshot("run:api-current", inspectionSnapshot());
  });

  afterEach(async () => {
    await pool.end();
  });

  function buildApp() {
    return buildStoryGraphApi({
      ingestionSessionRepository,
      storyRepository,
      ruleRepository: new RuleRepository(pool),
      provenanceRepository,
      verdictRepository,
      verdictRunRepository,
      llmClient: createConfiguredIngestionLlmClient({
        modelName: "test-model",
        extractor: async () => ({ candidates: [] })
      })
    });
  }

  it("returns a parsed run inspection response for an existing run", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/inspection/runs/run%3Aapi-current"
    });

    expect(response.statusCode).toBe(200);
    const parsed = RunInspectionResponseSchema.parse(response.json());
    expect(parsed.run.runId).toBe("run:api-current");
    expect(parsed.groups.map((group) => group.verdictKind)).toEqual([
      "Hard Contradiction",
      "Repairable Gap",
      "Soft Drift",
      "Consistent"
    ]);
    const detail = parsed.detailsByVerdictId["verdict:api-hard"];
    expect(detail.deterministicVerdict).toMatchObject({
      verdictKind: "Hard Contradiction",
      reasonCode: "impossible_travel"
    });
    expect(detail.repairs[0]).toMatchObject({
      repairId: "repair:api-bridge",
      plausibilityAdjustment: {
        adjustment: 0.2
      }
    });
    expect(detail.advisory.status).toBe("available");
    expect(JSON.stringify(detail.deterministicVerdict)).not.toContain("advisory");
    expect(JSON.stringify(detail.repairs)).not.toContain("driftScores");

    const responseText = response.body;
    expect(responseText).not.toContain("sourceWorkIds");
    expect(responseText).not.toContain("snapshotDir");
    expect(responseText).not.toContain("snapshotSet");
    expect(responseText).not.toContain("PriorSnapshot");
    expect(responseText).not.toContain("genreWeights");

    await app.close();
  });

  it("returns enriched inspection metadata for large-run exploration", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/inspection/runs/run%3Aapi-current"
    });

    expect(response.statusCode).toBe(200);
    const parsed = RunInspectionResponseSchema.parse(response.json());

    // Wave 0 red-phase contract: Tasks 12-01-02 and 12-01-03 must make this pass.
    expect(parsed.run.scopeSummary).toMatchObject({
      scopeId: "scope:api-current",
      scopeKind: "full_approved_draft",
      segmentCount: 2
    });
    expect(parsed.run.operationalSummary).toMatchObject({
      warningCount: 3,
      staleSegmentCount: 1,
      unresolvedSegmentCount: 1,
      failedSegmentCount: 1
    });
    expect(parsed.groups[0].verdicts[0].secondaryGroup).toMatchObject({
      groupKey: "chapter:draft-document:api-inspection:chapter-1",
      label: "Chapter 1"
    });
    expect(parsed.groups[0].verdicts[0].provenanceSummary).toMatchObject({
      segmentId: "segment:inspection:1",
      reviewState: "stale"
    });
    expect(parsed.detailsByVerdictId["verdict:api-hard"].sourceContext).toMatchObject({
      sourceSpans: [
        {
          sourceKind: "ingestion_session_raw_text",
          startOffset: 0,
          endOffset: 28
        }
      ]
    });

    expect(response.body).not.toContain("segmentText");
    expect(response.body).not.toContain("attempts");
    expect(response.body).not.toContain("artifactPath");

    await app.close();
  });

  it("returns stable 404 JSON for missing runs", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/inspection/runs/run%3Amissing"
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ message: "Inspection run not found." });

    await app.close();
  });

  it("rejects malformed run IDs without leaking internals", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/inspection/runs/%20"
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: "Invalid inspection run id." });
    expect(response.body).not.toContain("stack");
    expect(response.body).not.toContain("SELECT");
    expect(response.body).not.toContain("inspection_snapshot");
    expect(response.body).not.toContain("/home/");

    await app.close();
  });

  it("returns scope-labeled findingChanges for an explicit baseRunId", async () => {
    const app = buildApp();

    await verdictRunRepository.saveRun({
      runId: "run:api-base",
      storyId: "story:test",
      revisionId: "revision:test",
      triggerKind: "test",
      createdAt: "2026-04-10T10:50:00Z",
      scope: fullInspectionScope({
        scopeId: "scope:api-base",
        storyId: "story:test",
        revisionId: "revision:test",
        documentId: "draft-document:api-inspection",
        draftRevisionId: "draft-revision:api-base"
      })
    });
    await verdictRepository.saveVerdict({
      verdictId: "verdict:api-base",
      runId: "run:api-base",
      storyId: "story:test",
      revisionId: "revision:test",
      verdictKind: "Repairable Gap",
      category: "causal_gap",
      explanation: "Base run gap.",
      evidence: {
        findingId: "finding:api-base",
        representativeChecker: "causality",
        reasonCode: "missing_causal_link",
        eventIds: ["event:airport"],
        stateBoundaryIds: ["boundary:a"],
        ruleVersionIds: ["ruleversion:reality"],
        provenanceIds: ["provenance:api-base"],
        eventSummaries: [
          {
            eventId: "event:airport",
            eventType: "airport",
            sequence: 1,
            abstract: false,
            placeId: "place:seoul",
            actorIds: ["character:a"],
            targetIds: [],
            timeRelation: "after"
          }
        ],
        stateSummaries: [],
        ruleSummaries: [],
        conflictPath: ["event:airport"],
        missingPremises: [],
        supportingFindings: [],
        notEvaluated: []
      },
      createdAt: "2026-04-10T10:50:00Z"
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/inspection/runs/run%3Aapi-current?baseRunId=run%3Aapi-base"
    });

    expect(response.statusCode).toBe(200);
    const parsed = RunInspectionResponseSchema.parse(response.json());
    expect(parsed.diff).toMatchObject({
      currentRunId: "run:api-current",
      previousRunId: "run:api-base",
      currentScopeId: "scope:api-current",
      baseScopeId: "scope:api-base",
      currentComparisonScopeKey: "full:draft-document:api-inspection",
      baseComparisonScopeKey: "full:draft-document:api-inspection"
    });
    expect(parsed.diff?.findingChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          changeKind: "added",
          findingId: "finding:api-hard",
          scopeId: "scope:api-current",
          comparisonScopeKey: "full:draft-document:api-inspection"
        }),
        expect.objectContaining({
          changeKind: "resolved",
          findingId: "finding:api-base",
          scopeId: "scope:api-base",
          comparisonScopeKey: "full:draft-document:api-inspection"
        })
      ])
    );
    expect(parsed.diff?.findingChanges.length).toBeGreaterThan(0);
    expect(parsed.diff?.previousRunId).toBe("run:api-base");

    await app.close();
  });

  it("returns 409 when explicit baseRevisionId has no comparable scoped run", async () => {
    const app = buildApp();

    await pool.query(
      `
        INSERT INTO story_revisions (revision_id, story_id, source_kind, created_at)
        VALUES ($1, $2, $3, $4)
      `,
      ["revision:base", "story:test", "manual", "2026-04-10T10:49:30Z"]
    );

    await verdictRunRepository.saveRun({
      runId: "run:api-base-incompatible",
      storyId: "story:test",
      revisionId: "revision:base",
      triggerKind: "test",
      createdAt: "2026-04-10T10:51:00Z",
      scope: {
        scopeId: "scope:api-base-incompatible",
        scopeKind: "section",
        comparisonScopeKey: "section:draft-document:api-inspection:chapter:0",
        segmentIds: ["segment:inspection:1"],
        eventIds: ["event:airport"],
        sourceTextRefs: [
          {
            sourceKind: "ingestion_session_raw_text",
            sessionId: "session:inspection",
            startOffset: 0,
            endOffset: 13,
            textNormalization: "lf"
          }
        ],
        payload: {
          scopeKind: "section",
          scopeId: "scope:api-base-incompatible",
          documentId: "draft-document:api-inspection",
          draftRevisionId: "draft-revision:api-base",
          sectionId: "draft-section:inspection:1"
        }
      }
    });
    await verdictRepository.saveVerdict({
      verdictId: "verdict:api-base-incompatible",
      runId: "run:api-base-incompatible",
      storyId: "story:test",
      revisionId: "revision:base",
      verdictKind: "Soft Drift",
      category: "provenance_gap",
      explanation: "Scoped base run mismatch.",
      evidence: {
        findingId: "finding:api-base-incompatible",
        representativeChecker: "character",
        reasonCode: "motivation_drift",
        eventIds: ["event:airport"],
        stateBoundaryIds: ["boundary:a"],
        ruleVersionIds: ["ruleversion:reality"],
        provenanceIds: ["provenance:api-base-incompatible"],
        eventSummaries: [],
        stateSummaries: [],
        ruleSummaries: [],
        conflictPath: ["event:airport"],
        missingPremises: [],
        supportingFindings: [],
        notEvaluated: []
      },
      createdAt: "2026-04-10T10:51:00Z"
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/inspection/runs/run%3Aapi-current?baseRevisionId=revision%3Abase"
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      message: "Inspection comparison is incompatible."
    });
    expect(response.body).not.toContain("SELECT");
    expect(response.body).not.toContain("stack");

    await app.close();
  });
});
