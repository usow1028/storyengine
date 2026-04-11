import { newDb } from "pg-mem";
import type { Pool } from "pg";

import { buildStoryGraphApi } from "../../src/api/app.js";
import type {
  RunInspectionSnapshot,
  VerdictRecord,
  VerdictRunScope
} from "../../src/domain/index.js";
import { createConfiguredIngestionLlmClient } from "../../src/services/index.js";
import {
  applyCanonicalSchema,
  IngestionSessionRepository,
  ProvenanceRepository,
  RuleRepository,
  StoryRepository,
  VerdictRepository,
  VerdictRunRepository
} from "../../src/storage/index.js";
import { buildImpossibleTravelFixture } from "../fixtures/hard-constraint-fixtures.js";

const HOST = "127.0.0.1";
const PORT = 4178;
const RUN_ID = "run:revision:test:2026-04-10T12:30:00Z";

function createTestClient(): { pool: Pool } {
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
    verdictId: "verdict:browser-hard",
    runId: RUN_ID,
    storyId: "story:test",
    revisionId: "revision:test",
    verdictKind: "Hard Contradiction",
    category: "temporal_contradiction",
    explanation: "A character cannot cross the ocean instantly.",
    evidence: {
      findingId: "finding:browser-hard",
      representativeChecker: "time",
      reasonCode: "impossible_travel",
      eventIds: ["event:airport", "event:meeting"],
      stateBoundaryIds: ["boundary:a"],
      ruleVersionIds: ["ruleversion:reality"],
      provenanceIds: ["provenance:browser-hard"],
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
    createdAt: "2026-04-10T12:30:01Z"
  };
}

function softVerdict(): VerdictRecord {
  return {
    verdictId: "verdict:browser-soft",
    runId: RUN_ID,
    storyId: "story:test",
    revisionId: "revision:test",
    verdictKind: "Soft Drift",
    category: "provenance_gap",
    explanation: "Arrival motivation still needs explicit setup.",
    evidence: {
      findingId: "finding:browser-soft",
      representativeChecker: "character",
      reasonCode: "motivation_drift",
      eventIds: ["event:meeting"],
      stateBoundaryIds: [],
      ruleVersionIds: [],
      provenanceIds: ["provenance:browser-soft"],
      eventSummaries: [],
      stateSummaries: [],
      ruleSummaries: [],
      conflictPath: ["event:meeting"],
      missingPremises: [],
      supportingFindings: [],
      notEvaluated: []
    },
    createdAt: "2026-04-10T12:30:02Z"
  };
}

function inspectionSnapshot(): RunInspectionSnapshot {
  const repair = {
    repairId: "repair:browser-bridge",
    repairType: "add_prior_event" as const,
    reasonCode: "impossible_travel",
    sourceFindingIds: ["finding:browser-hard"],
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
    runId: RUN_ID,
    createdAt: "2026-04-10T12:30:00Z",
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
          repairId: "repair:browser-bridge",
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

function fullInspectionScope(): VerdictRunScope {
  return {
    scopeId: "scope:browser-current",
    scopeKind: "full_approved_draft",
    comparisonScopeKey: "full:draft-document:browser-inspection",
    segmentIds: ["segment:browser:1", "segment:browser:2"],
    eventIds: ["event:airport", "event:meeting"],
    sourceTextRefs: [createSourceTextRef("session:browser", 0, 56)],
    payload: {
      scopeKind: "full_approved_draft",
      scopeId: "scope:browser-current",
      documentId: "draft-document:browser-inspection",
      draftRevisionId: "draft-revision:browser-inspection",
      storyId: "story:test",
      revisionId: "revision:test"
    }
  };
}

async function seedInspectionRun(pool: Pool): Promise<string> {
  const fixture = buildImpossibleTravelFixture();
  const storyRepository = new StoryRepository(pool);
  const ingestionSessionRepository = new IngestionSessionRepository(pool);
  const provenanceRepository = new ProvenanceRepository(pool);
  const verdictRepository = new VerdictRepository(pool);
  const verdictRunRepository = new VerdictRunRepository(pool);

  await storyRepository.saveGraph(fixture.graph);

  await ingestionSessionRepository.createSession({
    sessionId: "session:browser",
    storyId: "story:test",
    revisionId: "revision:test",
    draftTitle: "Inspection Browser Draft",
    defaultRulePackName: "reality-default",
    inputKind: "full_draft",
    rawText: "Arrival beat 1.\nArrival beat 2.\nReview beat.\nFailed beat.",
    workflowState: "partial_failure",
    promptFamily: "phase12-browser-test",
    modelName: "test-model",
    lastVerdictRunId: null,
    createdAt: "2026-04-10T12:25:00Z",
    updatedAt: "2026-04-10T12:30:00Z",
    lastCheckedAt: null
  });
  await ingestionSessionRepository.saveDraftPlan("session:browser", {
    document: {
      documentId: "draft-document:browser-inspection",
      storyId: "story:test",
      title: "Inspection Browser Draft",
      createdAt: "2026-04-10T12:25:00Z",
      updatedAt: "2026-04-10T12:30:00Z"
    },
    revision: {
      draftRevisionId: "draft-revision:browser-inspection",
      documentId: "draft-document:browser-inspection",
      storyId: "story:test",
      revisionId: "revision:test",
      basedOnDraftRevisionId: null,
      createdAt: "2026-04-10T12:25:00Z"
    },
    sections: [
      {
        sectionId: "draft-section:browser:chapter-1",
        draftRevisionId: "draft-revision:browser-inspection",
        sectionKind: "chapter",
        sequence: 0,
        label: "Chapter 1",
        sourceTextRef: createSourceTextRef("session:browser", 0, 28)
      },
      {
        sectionId: "draft-section:browser:chapter-2",
        draftRevisionId: "draft-revision:browser-inspection",
        sectionKind: "chapter",
        sequence: 1,
        label: "Chapter 2",
        sourceTextRef: createSourceTextRef("session:browser", 29, 56)
      }
    ],
    segments: [
      {
        segment: {
          segmentId: "segment:browser:1",
          sessionId: "session:browser",
          sequence: 0,
          label: "Arrival beat 1",
          startOffset: 0,
          endOffset: 28,
          segmentText: "Arrival beat 1.",
          draftRevisionId: "draft-revision:browser-inspection",
          sectionId: "draft-section:browser:chapter-1",
          draftPath: {
            documentId: "draft-document:browser-inspection",
            draftRevisionId: "draft-revision:browser-inspection",
            sectionId: "draft-section:browser:chapter-1",
            segmentId: "segment:browser:1",
            sequence: 0
          },
          sourceTextRef: createSourceTextRef("session:browser", 0, 28),
          workflowState: "approved",
          approvedAt: "2026-04-10T12:26:00Z",
          attemptCount: 0,
          lastExtractionAt: null,
          lastAttemptStatus: null,
          lastFailureSummary: null,
          stale: true,
          staleReason: "review_patch",
          currentAttemptId: null
        },
        sourceTextRef: createSourceTextRef("session:browser", 0, 28),
        draftPath: {
          documentId: "draft-document:browser-inspection",
          draftRevisionId: "draft-revision:browser-inspection",
          sectionId: "draft-section:browser:chapter-1",
          segmentId: "segment:browser:1",
          sequence: 0
        }
      },
      {
        segment: {
          segmentId: "segment:browser:2",
          sessionId: "session:browser",
          sequence: 1,
          label: "Arrival beat 2",
          startOffset: 29,
          endOffset: 56,
          segmentText: "Arrival beat 2.",
          draftRevisionId: "draft-revision:browser-inspection",
          sectionId: "draft-section:browser:chapter-2",
          draftPath: {
            documentId: "draft-document:browser-inspection",
            draftRevisionId: "draft-revision:browser-inspection",
            sectionId: "draft-section:browser:chapter-2",
            segmentId: "segment:browser:2",
            sequence: 1
          },
          sourceTextRef: createSourceTextRef("session:browser", 29, 56),
          workflowState: "approved",
          approvedAt: "2026-04-10T12:27:00Z",
          attemptCount: 0,
          lastExtractionAt: null,
          lastAttemptStatus: null,
          lastFailureSummary: null,
          stale: false,
          staleReason: null,
          currentAttemptId: null
        },
        sourceTextRef: createSourceTextRef("session:browser", 29, 56),
        draftPath: {
          documentId: "draft-document:browser-inspection",
          draftRevisionId: "draft-revision:browser-inspection",
          sectionId: "draft-section:browser:chapter-2",
          segmentId: "segment:browser:2",
          sequence: 1
        }
      },
      {
        segment: {
          segmentId: "segment:browser:3",
          sessionId: "session:browser",
          sequence: 2,
          label: "Review beat",
          startOffset: 57,
          endOffset: 84,
          segmentText: "Review beat.",
          draftRevisionId: "draft-revision:browser-inspection",
          sectionId: "draft-section:browser:chapter-2",
          draftPath: {
            documentId: "draft-document:browser-inspection",
            draftRevisionId: "draft-revision:browser-inspection",
            sectionId: "draft-section:browser:chapter-2",
            segmentId: "segment:browser:3",
            sequence: 2
          },
          sourceTextRef: createSourceTextRef("session:browser", 57, 84),
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
        sourceTextRef: createSourceTextRef("session:browser", 57, 84),
        draftPath: {
          documentId: "draft-document:browser-inspection",
          draftRevisionId: "draft-revision:browser-inspection",
          sectionId: "draft-section:browser:chapter-2",
          segmentId: "segment:browser:3",
          sequence: 2
        }
      },
      {
        segment: {
          segmentId: "segment:browser:4",
          sessionId: "session:browser",
          sequence: 3,
          label: "Failed beat",
          startOffset: 85,
          endOffset: 112,
          segmentText: "Failed beat.",
          draftRevisionId: "draft-revision:browser-inspection",
          sectionId: "draft-section:browser:chapter-2",
          draftPath: {
            documentId: "draft-document:browser-inspection",
            draftRevisionId: "draft-revision:browser-inspection",
            sectionId: "draft-section:browser:chapter-2",
            segmentId: "segment:browser:4",
            sequence: 3
          },
          sourceTextRef: createSourceTextRef("session:browser", 85, 112),
          workflowState: "failed",
          approvedAt: null,
          attemptCount: 1,
          lastExtractionAt: "2026-04-10T12:28:00Z",
          lastAttemptStatus: "failed",
          lastFailureSummary: "LLM extraction failed",
          stale: false,
          staleReason: null,
          currentAttemptId: "attempt:browser:4:1"
        },
        sourceTextRef: createSourceTextRef("session:browser", 85, 112),
        draftPath: {
          documentId: "draft-document:browser-inspection",
          draftRevisionId: "draft-revision:browser-inspection",
          sectionId: "draft-section:browser:chapter-2",
          segmentId: "segment:browser:4",
          sequence: 3
        }
      }
    ],
    checkScopes: [
      {
        scopeKind: "full_approved_draft",
        scopeId: "scope:browser-current",
        documentId: "draft-document:browser-inspection",
        draftRevisionId: "draft-revision:browser-inspection",
        storyId: "story:test",
        revisionId: "revision:test"
      }
    ],
    normalizedRawText: "Arrival beat 1.\nArrival beat 2.\nReview beat.\nFailed beat."
  });
  await ingestionSessionRepository.saveSegments("session:browser", [
    {
      segmentId: "segment:browser:1",
      sessionId: "session:browser",
      sequence: 0,
      label: "Arrival beat 1",
      startOffset: 0,
      endOffset: 28,
      segmentText: "Arrival beat 1.",
      draftRevisionId: "draft-revision:browser-inspection",
      sectionId: "draft-section:browser:chapter-1",
      draftPath: {
        documentId: "draft-document:browser-inspection",
        draftRevisionId: "draft-revision:browser-inspection",
        sectionId: "draft-section:browser:chapter-1",
        segmentId: "segment:browser:1",
        sequence: 0
      },
      sourceTextRef: createSourceTextRef("session:browser", 0, 28),
      workflowState: "approved",
      approvedAt: "2026-04-10T12:26:00Z",
      attemptCount: 0,
      lastExtractionAt: null,
      lastAttemptStatus: null,
      lastFailureSummary: null,
      stale: true,
      staleReason: "review_patch",
      currentAttemptId: null
    },
    {
      segmentId: "segment:browser:2",
      sessionId: "session:browser",
      sequence: 1,
      label: "Arrival beat 2",
      startOffset: 29,
      endOffset: 56,
      segmentText: "Arrival beat 2.",
      draftRevisionId: "draft-revision:browser-inspection",
      sectionId: "draft-section:browser:chapter-2",
      draftPath: {
        documentId: "draft-document:browser-inspection",
        draftRevisionId: "draft-revision:browser-inspection",
        sectionId: "draft-section:browser:chapter-2",
        segmentId: "segment:browser:2",
        sequence: 1
      },
      sourceTextRef: createSourceTextRef("session:browser", 29, 56),
      workflowState: "approved",
      approvedAt: "2026-04-10T12:27:00Z",
      attemptCount: 0,
      lastExtractionAt: null,
      lastAttemptStatus: null,
      lastFailureSummary: null,
      stale: false,
      staleReason: null,
      currentAttemptId: null
    },
    {
      segmentId: "segment:browser:3",
      sessionId: "session:browser",
      sequence: 2,
      label: "Review beat",
      startOffset: 57,
      endOffset: 84,
      segmentText: "Review beat.",
      draftRevisionId: "draft-revision:browser-inspection",
      sectionId: "draft-section:browser:chapter-2",
      draftPath: {
        documentId: "draft-document:browser-inspection",
        draftRevisionId: "draft-revision:browser-inspection",
        sectionId: "draft-section:browser:chapter-2",
        segmentId: "segment:browser:3",
        sequence: 2
      },
      sourceTextRef: createSourceTextRef("session:browser", 57, 84),
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
      segmentId: "segment:browser:4",
      sessionId: "session:browser",
      sequence: 3,
      label: "Failed beat",
      startOffset: 85,
      endOffset: 112,
      segmentText: "Failed beat.",
      draftRevisionId: "draft-revision:browser-inspection",
      sectionId: "draft-section:browser:chapter-2",
      draftPath: {
        documentId: "draft-document:browser-inspection",
        draftRevisionId: "draft-revision:browser-inspection",
        sectionId: "draft-section:browser:chapter-2",
        segmentId: "segment:browser:4",
        sequence: 3
      },
      sourceTextRef: createSourceTextRef("session:browser", 85, 112),
      workflowState: "failed",
      approvedAt: null,
      attemptCount: 1,
      lastExtractionAt: "2026-04-10T12:28:00Z",
      lastAttemptStatus: "failed",
      lastFailureSummary: "LLM extraction failed",
      stale: false,
      staleReason: null,
      currentAttemptId: "attempt:browser:4:1"
    }
  ]);
  await pool.query(
    `
      UPDATE ingestion_segments
      SET stale = CASE WHEN segment_id = 'segment:browser:1' THEN TRUE ELSE FALSE END,
          stale_reason = CASE
            WHEN segment_id = 'segment:browser:1' THEN 'review_patch'
            ELSE NULL
          END,
          attempt_count = CASE
            WHEN segment_id = 'segment:browser:4' THEN 1
            ELSE 0
          END,
          last_extraction_at = CASE
            WHEN segment_id = 'segment:browser:4' THEN '2026-04-10T12:28:00Z'
            ELSE NULL
          END,
          last_attempt_status = CASE
            WHEN segment_id = 'segment:browser:4' THEN 'failed'
            ELSE NULL
          END,
          last_failure_summary = CASE
            WHEN segment_id = 'segment:browser:4' THEN 'LLM extraction failed'
            ELSE NULL
          END,
          current_attempt_id = CASE
            WHEN segment_id = 'segment:browser:4' THEN 'attempt:browser:4:1'
            ELSE NULL
          END
      WHERE session_id = 'session:browser'
    `
  );

  await provenanceRepository.saveMany([
    {
      provenanceId: "provenance:browser-hard",
      ownerType: "verdict",
      ownerId: "verdict:browser-hard",
      sourceKind: "normalized",
      sourceRef: "segment:browser:1",
      detail: {
        sessionId: "session:browser",
        segmentId: "segment:browser:1",
        sourceSpanStart: 0,
        sourceSpanEnd: 28
      }
    },
    {
      provenanceId: "provenance:browser-soft",
      ownerType: "verdict",
      ownerId: "verdict:browser-soft",
      sourceKind: "normalized",
      sourceRef: "segment:browser:2",
      detail: {
        sessionId: "session:browser",
        segmentId: "segment:browser:2",
        sourceSpanStart: 29,
        sourceSpanEnd: 56
      }
    }
  ]);

  await verdictRunRepository.saveRun({
    runId: RUN_ID,
    storyId: "story:test",
    revisionId: "revision:test",
    triggerKind: "test",
    createdAt: "2026-04-10T12:30:00Z",
    scope: fullInspectionScope()
  });
  await verdictRepository.saveMany([hardVerdict(), softVerdict()]);
  await verdictRunRepository.saveInspectionSnapshot(RUN_ID, inspectionSnapshot());

  return RUN_ID;
}

async function startServer() {
  const { pool } = createTestClient();
  await applyCanonicalSchema(pool);
  const runId = await seedInspectionRun(pool);
  const app = buildStoryGraphApi({
    ingestionSessionRepository: new IngestionSessionRepository(pool),
    storyRepository: new StoryRepository(pool),
    ruleRepository: new RuleRepository(pool),
    provenanceRepository: new ProvenanceRepository(pool),
    verdictRepository: new VerdictRepository(pool),
    verdictRunRepository: new VerdictRunRepository(pool),
    llmClient: createConfiguredIngestionLlmClient({
      modelName: "inspection-browser-test",
      extractor: async () => ({ candidates: [] })
    }),
    inspectionUiDistDir: "dist/ui"
  });

  await app.listen({ host: HOST, port: PORT });
  console.log(
    `[inspection-test-server] listening=http://${HOST}:${PORT} runId=${runId} route=/inspection/runs/${encodeURIComponent(runId)}`
  );

  const shutdown = async () => {
    await app.close();
    await pool.end();
  };

  process.once("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });
  process.once("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });
}

startServer().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
