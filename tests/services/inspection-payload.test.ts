import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import {
  RunInspectionResponseSchema,
  type RunInspectionSnapshot,
  type VerdictEvidence,
  type VerdictRecord
} from "../../src/domain/index.js";
import { buildRunInspectionPayload } from "../../src/services/inspection-payload.js";
import {
  applyCanonicalSchema,
  StoryRepository,
  VerdictRepository,
  VerdictRunRepository
} from "../../src/storage/index.js";
import { buildImpossibleTravelFixture } from "../fixtures/hard-constraint-fixtures.js";

function createTestClient() {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  return { pool };
}

function evidence(overrides: Partial<VerdictEvidence> = {}): VerdictEvidence {
  return {
    findingId: "finding:hard",
    representativeChecker: "time",
    reasonCode: "impossible_travel",
    eventIds: ["event:meeting", "event:airport"],
    stateBoundaryIds: ["boundary:a"],
    ruleVersionIds: ["ruleversion:reality"],
    provenanceIds: ["provenance:hard"],
    eventSummaries: [
      {
        eventId: "event:meeting",
        eventType: "meeting",
        sequence: 2,
        abstract: false,
        placeId: "place:newyork",
        actorIds: ["character:a"],
        targetIds: [],
        timeRelation: "same-window"
      },
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
    stateSummaries: [
      {
        characterId: "character:a",
        stateBoundaryId: "boundary:a",
        relevantAxes: ["locationId"],
        values: {
          locationId: "place:newyork",
          aliveStatus: "alive"
        }
      }
    ],
    ruleSummaries: [
      {
        rulePackId: "rulepack:reality",
        ruleVersionId: "ruleversion:reality",
        name: "Default travel physics",
        scope: "global",
        worldAffiliation: "movement",
        active: true,
        effects: ["Travel requires enough elapsed time."]
      }
    ],
    conflictPath: ["event:airport", "event:meeting"],
    missingPremises: [
      {
        kind: "missing_prior_event",
        description: "Explain how the character crosses the ocean.",
        relatedEventId: "event:meeting"
      }
    ],
    supportingFindings: [
      {
        checker: "space",
        reasonCode: "distance_gap",
        category: "physical_impossibility",
        verdictKind: "Hard Contradiction",
        explanation: "The locations are too far apart.",
        evidence: {
          eventIds: ["event:airport", "event:meeting"],
          stateBoundaryIds: [],
          ruleVersionIds: [],
          provenanceIds: []
        }
      }
    ],
    notEvaluated: [],
    ...overrides
  };
}

function verdict(input: {
  verdictId: string;
  runId: string;
  verdictKind: VerdictRecord["verdictKind"];
  category: VerdictRecord["category"];
  explanation: string;
  evidence: VerdictEvidence;
  createdAt: string;
}): VerdictRecord {
  return {
    verdictId: input.verdictId,
    runId: input.runId,
    storyId: "story:test",
    revisionId: "revision:test",
    verdictKind: input.verdictKind,
    category: input.category,
    explanation: input.explanation,
    evidence: input.evidence,
    createdAt: input.createdAt
  };
}

function snapshot(runId: string): RunInspectionSnapshot {
  const repair = {
    repairId: "repair:bridge-ocean",
    repairType: "add_prior_event" as const,
    reasonCode: "impossible_travel",
    sourceFindingIds: ["finding:hard"],
    confidenceBand: "medium" as const,
    summary: "Add a prior travel event before the meeting.",
    payload: {
      insertBeforeEventId: "event:meeting",
      anchorEventId: "event:airport",
      eventType: "flight",
      summary: "The character boards a long flight.",
      expectedEffect: "Travel time becomes explicit before the meeting."
    }
  };

  return {
    runId,
    createdAt: "2026-04-10T10:00:00Z",
    repairCandidates: [
      repair,
      {
        repairId: "repair:unrelated",
        repairType: "add_missing_assumption",
        reasonCode: "other_gap",
        sourceFindingIds: ["finding:other"],
        confidenceBand: "low",
        summary: "Unrelated repair should not attach to the hard finding.",
        payload: {
          assumptionText: "Someone else handled another gap."
        }
      }
    ],
    advisory: {
      status: "available",
      assessment: {
        driftScores: {
          transition_drift: 0.72,
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
        representativePatternSummary: "Long-distance arrivals usually need travel setup.",
        contributions: [
          {
            layer: "baseline",
            genreKey: "baseline",
            worldProfile: "reality-default",
            driftType: "transition_drift",
            sampleCount: 21,
            confidence: 0.8,
            appliedWeight: 1,
            score: 0.72,
            threshold: 0.5,
            patternKey: "travel::setup",
            representativePatternSummary: "Long-distance arrivals usually need travel setup."
          }
        ]
      },
      rerankedRepairs: [repair],
      repairPlausibilityAdjustments: [
        {
          repairId: repair.repairId,
          adjustment: 0.25,
          confidence: 0.8,
          dominantPriorLayer: "baseline",
          representativePatternSummary: "Long-distance arrivals usually need travel setup."
        }
      ]
    }
  };
}

function snapshotWithRerankedRepairs(runId: string): RunInspectionSnapshot {
  const base = snapshot(runId);
  if (base.advisory.status !== "available") {
    throw new Error("Expected available advisory in test snapshot.");
  }

  const lowPriorityRepair = {
    ...base.repairCandidates[0],
    repairId: "repair:slow-boat",
    summary: "Add a slower ocean crossing setup."
  };
  const highPriorityRepair = {
    ...base.repairCandidates[0],
    repairId: "repair:direct-flight",
    summary: "Add a direct flight that explains the arrival window."
  };
  const unrelatedRepair = base.repairCandidates[1];

  return {
    ...base,
    repairCandidates: [lowPriorityRepair, highPriorityRepair, unrelatedRepair],
    advisory: {
      ...base.advisory,
      rerankedRepairs: [highPriorityRepair, lowPriorityRepair, unrelatedRepair],
      repairPlausibilityAdjustments: [
        {
          repairId: highPriorityRepair.repairId,
          adjustment: 0.4,
          confidence: 0.9,
          dominantPriorLayer: "baseline",
          representativePatternSummary: "Direct travel setup is the strongest repair."
        },
        {
          repairId: lowPriorityRepair.repairId,
          adjustment: 0.1,
          confidence: 0.6,
          dominantPriorLayer: "baseline",
          representativePatternSummary: "Slow travel setup is less plausible here."
        }
      ]
    }
  };
}

async function saveRevision(
  pool: Pool,
  input: { storyId: string; revisionId: string; createdAt: string }
) {
  await pool.query(
    `
      INSERT INTO story_revisions (revision_id, story_id, source_kind, created_at)
      VALUES ($1, $2, $3, $4)
    `,
    [input.revisionId, input.storyId, "manual", input.createdAt]
  );
}

function fullScope(input: {
  scopeId: string;
  storyId: string;
  revisionId: string;
  draftRevisionId: string;
  comparisonScopeKey: string;
}) {
  return {
    scopeId: input.scopeId,
    scopeKind: "full_approved_draft" as const,
    comparisonScopeKey: input.comparisonScopeKey,
    segmentIds: ["segment:scope:1", "segment:scope:2"],
    eventIds: ["event:airport", "event:meeting"],
    sourceTextRefs: [
      {
        sourceKind: "ingestion_session_raw_text" as const,
        sessionId: "session:scope",
        startOffset: 0,
        endOffset: 48,
        textNormalization: "lf" as const
      }
    ],
    payload: {
      scopeKind: "full_approved_draft" as const,
      scopeId: input.scopeId,
      documentId: "draft-document:scope",
      draftRevisionId: input.draftRevisionId,
      storyId: input.storyId,
      revisionId: input.revisionId
    }
  };
}

describe("inspection payload service", () => {
  let pool: Pool;
  let verdictRepository: VerdictRepository;
  let verdictRunRepository: VerdictRunRepository;

  beforeEach(async () => {
    const created = createTestClient();
    pool = created.pool;
    await applyCanonicalSchema(pool);

    const fixture = buildImpossibleTravelFixture();
    await new StoryRepository(pool).saveGraph(fixture.graph);

    verdictRepository = new VerdictRepository(pool);
    verdictRunRepository = new VerdictRunRepository(pool);
  });

  afterEach(async () => {
    await pool.end();
  });

  async function seedRunWithSnapshot(
    runSnapshot: RunInspectionSnapshot = snapshot("run:current")
  ): Promise<void> {
    await verdictRunRepository.saveRun({
      runId: "run:previous",
      storyId: "story:test",
      revisionId: "revision:test",
      triggerKind: "test",
      createdAt: "2026-04-10T09:55:00Z"
    });
    await verdictRepository.saveVerdict(
      verdict({
        verdictId: "verdict:previous",
        runId: "run:previous",
        verdictKind: "Repairable Gap",
        category: "causal_gap",
        explanation: "Previous gap",
        evidence: evidence({
          findingId: "finding:previous",
          representativeChecker: "causality",
          reasonCode: "missing_causal_link",
          eventIds: ["event:airport"],
          eventSummaries: [],
          conflictPath: ["event:airport"],
          supportingFindings: []
        }),
        createdAt: "2026-04-10T09:55:00Z"
      })
    );

    await verdictRunRepository.saveRun({
      runId: "run:current",
      storyId: "story:test",
      revisionId: "revision:test",
      previousRunId: "run:previous",
      triggerKind: "test",
      createdAt: "2026-04-10T10:00:00Z"
    });
    await verdictRepository.saveMany([
      verdict({
        verdictId: "verdict:soft",
        runId: "run:current",
        verdictKind: "Soft Drift",
        category: "provenance_gap",
        explanation: "Motivation drift needs context.",
        evidence: evidence({
          findingId: "finding:soft",
          representativeChecker: "character",
          reasonCode: "motivation_drift",
          eventIds: ["event:meeting"],
          eventSummaries: [],
          stateBoundaryIds: [],
          ruleVersionIds: [],
          provenanceIds: []
        }),
        createdAt: "2026-04-10T10:00:01Z"
      }),
      verdict({
        verdictId: "verdict:hard",
        runId: "run:current",
        verdictKind: "Hard Contradiction",
        category: "temporal_contradiction",
        explanation: "A character cannot cross the ocean instantly.",
        evidence: evidence(),
        createdAt: "2026-04-10T10:00:02Z"
      }),
      verdict({
        verdictId: "verdict:consistent",
        runId: "run:current",
        verdictKind: "Consistent",
        category: "provenance_gap",
        explanation: "The remaining facts are consistent.",
        evidence: evidence({
          findingId: "finding:consistent",
          representativeChecker: undefined,
          reasonCode: undefined,
          eventIds: [],
          eventSummaries: [],
          stateBoundaryIds: [],
          ruleVersionIds: [],
          provenanceIds: [],
          conflictPath: [],
          missingPremises: [],
          supportingFindings: []
        }),
        createdAt: "2026-04-10T10:00:03Z"
      })
    ]);
    await verdictRunRepository.saveInspectionSnapshot("run:current", runSnapshot);
  }

  it("groups verdict summaries in fixed order and chooses the first verdict in the first non-empty group", async () => {
    await seedRunWithSnapshot();

    const payload = await buildRunInspectionPayload({
      runId: "run:current",
      verdictRunRepository,
      verdictRepository
    });

    const parsed = RunInspectionResponseSchema.parse(payload);
    expect(parsed.groups.map((group) => group.verdictKind)).toEqual([
      "Hard Contradiction",
      "Repairable Gap",
      "Soft Drift",
      "Consistent"
    ]);
    expect(parsed.groups.map((group) => group.count)).toEqual([1, 0, 1, 1]);
    expect(parsed.groups[1].verdicts).toEqual([]);
    expect(parsed.selectedVerdictId).toBe("verdict:hard");
    expect(parsed.groups[0].verdicts[0]).toMatchObject({
      verdictId: "verdict:hard",
      verdictKind: "Hard Contradiction",
      category: "temporal_contradiction",
      findingId: "finding:hard",
      reasonCode: "impossible_travel",
      relatedEventIds: ["event:meeting", "event:airport"]
    });
  });

  it("shapes selected details with deterministic evidence, timeline, repairs, advisory, trace, and diff", async () => {
    await seedRunWithSnapshot();

    const payload = await buildRunInspectionPayload({
      runId: "run:current",
      verdictRunRepository,
      verdictRepository
    });

    const parsed = RunInspectionResponseSchema.parse(payload);
    const detail = parsed.detailsByVerdictId["verdict:hard"];
    expect(detail).toBeDefined();
    expect(detail.deterministicVerdict).toMatchObject({
      verdictKind: "Hard Contradiction",
      findingId: "finding:hard",
      reasonCode: "impossible_travel",
      representativeChecker: "time"
    });
    expect(detail.evidenceSummary).toMatchObject({
      summary: "A character cannot cross the ocean instantly.",
      eventCount: 2,
      stateCount: 1,
      ruleCount: 1
    });
    expect(detail.timeline.map((item) => item.eventId)).toEqual([
      "event:airport",
      "event:meeting"
    ]);
    expect(detail.timeline[0]).toMatchObject({
      summary: "airport at place:seoul",
      relatedStateBoundaryIds: ["boundary:a"],
      relatedRuleVersionIds: ["ruleversion:reality"]
    });
    expect(detail.repairs).toHaveLength(1);
    expect(detail.repairs[0]).toMatchObject({
      repairId: "repair:bridge-ocean",
      plausibilityAdjustment: {
        adjustment: 0.25,
        dominantPriorLayer: "baseline"
      }
    });
    expect(detail.advisory.status).toBe("available");
    expect(detail.trace).toMatchObject({
      findingId: "finding:hard",
      reasonCode: "impossible_travel",
      conflictPath: ["event:airport", "event:meeting"],
      eventIds: ["event:meeting", "event:airport"],
      stateBoundaryIds: ["boundary:a"],
      ruleVersionIds: ["ruleversion:reality"]
    });
    expect(detail.diff).toMatchObject({
      currentRunId: "run:current",
      previousRunId: "run:previous",
      representativeVerdictChanged: true,
      addedFindingIds: expect.arrayContaining(["finding:hard"]),
      resolvedFindingIds: expect.arrayContaining(["finding:previous"])
    });
  });

  it("serializes finding-level diff labels for explicit base selectors", async () => {
    const comparisonScopeKey = "full:draft-document:scope";
    const baseRevisionId = "revision:base";

    await saveRevision(pool, {
      storyId: "story:test",
      revisionId: baseRevisionId,
      createdAt: "2026-04-10T09:50:00Z"
    });

    await verdictRunRepository.saveRun({
      runId: "run:base-explicit",
      storyId: "story:test",
      revisionId: baseRevisionId,
      triggerKind: "test",
      createdAt: "2026-04-10T09:52:00Z",
      scope: fullScope({
        scopeId: "scope:base-explicit",
        storyId: "story:test",
        revisionId: baseRevisionId,
        draftRevisionId: "draft-revision:base",
        comparisonScopeKey
      })
    });
    await verdictRepository.saveVerdict(
      verdict({
        verdictId: "verdict:base-explicit",
        runId: "run:base-explicit",
        verdictKind: "Repairable Gap",
        category: "causal_gap",
        explanation: "Base revision gap",
        evidence: evidence({
          findingId: "finding:base-explicit",
          representativeChecker: "causality",
          reasonCode: "missing_causal_link"
        }),
        createdAt: "2026-04-10T09:52:00Z"
      })
    );

    await verdictRunRepository.saveRun({
      runId: "run:previous-scoped",
      storyId: "story:test",
      revisionId: "revision:test",
      triggerKind: "test",
      createdAt: "2026-04-10T09:55:00Z",
      scope: fullScope({
        scopeId: "scope:previous-scoped",
        storyId: "story:test",
        revisionId: "revision:test",
        draftRevisionId: "draft-revision:previous",
        comparisonScopeKey
      })
    });
    await verdictRepository.saveVerdict(
      verdict({
        verdictId: "verdict:previous-scoped",
        runId: "run:previous-scoped",
        verdictKind: "Soft Drift",
        category: "provenance_gap",
        explanation: "Previous scoped drift",
        evidence: evidence({
          findingId: "finding:previous-scoped",
          representativeChecker: "character",
          reasonCode: "motivation_drift"
        }),
        createdAt: "2026-04-10T09:55:00Z"
      })
    );

    await verdictRunRepository.saveRun({
      runId: "run:current-scoped",
      storyId: "story:test",
      revisionId: "revision:test",
      previousRunId: "run:previous-scoped",
      triggerKind: "test",
      createdAt: "2026-04-10T10:00:00Z",
      scope: fullScope({
        scopeId: "scope:current-scoped",
        storyId: "story:test",
        revisionId: "revision:test",
        draftRevisionId: "draft-revision:current",
        comparisonScopeKey
      })
    });
    await verdictRepository.saveVerdict(
      verdict({
        verdictId: "verdict:current-scoped",
        runId: "run:current-scoped",
        verdictKind: "Hard Contradiction",
        category: "temporal_contradiction",
        explanation: "Current scoped hard contradiction",
        evidence: evidence(),
        createdAt: "2026-04-10T10:00:00Z"
      })
    );
    await verdictRunRepository.saveInspectionSnapshot(
      "run:current-scoped",
      snapshot("run:current-scoped")
    );

    const payload = await buildRunInspectionPayload({
      runId: "run:current-scoped",
      baseRevisionId,
      verdictRunRepository,
      verdictRepository
    });

    const parsed = RunInspectionResponseSchema.parse(payload);
    expect(parsed.diff).toMatchObject({
      currentRunId: "run:current-scoped",
      previousRunId: "run:base-explicit",
      currentScopeId: "scope:current-scoped",
      baseScopeId: "scope:base-explicit"
    });
    expect(parsed.diff?.findingChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          changeKind: "added",
          findingId: "finding:hard",
          verdictKind: "Hard Contradiction",
          scopeId: "scope:current-scoped",
          comparisonScopeKey,
          representativeChecker: "time",
          reasonCode: "impossible_travel",
          eventIds: ["event:meeting", "event:airport"]
        }),
        expect.objectContaining({
          changeKind: "resolved",
          findingId: "finding:base-explicit",
          verdictKind: "Repairable Gap",
          scopeId: "scope:base-explicit",
          comparisonScopeKey,
          representativeChecker: "causality",
          reasonCode: "missing_causal_link"
        })
      ])
    );
    expect(parsed.diff?.findingChanges.length).toBeGreaterThan(0);
    const serializedDiffItems = JSON.stringify(parsed.diff?.findingChanges);
    expect(serializedDiffItems).not.toContain("repairCandidates");
    expect(serializedDiffItems).not.toContain("rerankedRepairs");
    expect(serializedDiffItems).not.toContain("representativePatternSummary");
  });

  it("uses soft-prior reranked repairs when displaying selected verdict repair order", async () => {
    await seedRunWithSnapshot(snapshotWithRerankedRepairs("run:current"));

    const payload = await buildRunInspectionPayload({
      runId: "run:current",
      verdictRunRepository,
      verdictRepository
    });

    const parsed = RunInspectionResponseSchema.parse(payload);
    const detail = parsed.detailsByVerdictId["verdict:hard"];

    expect(detail.repairs.map((repair) => repair.repairId)).toEqual([
      "repair:direct-flight",
      "repair:slow-boat"
    ]);
    expect(detail.repairs.map((repair) => repair.plausibilityAdjustment?.adjustment)).toEqual([
      0.4,
      0.1
    ]);
    expect(parsed.groups[0].verdicts[0].repairCandidateCount).toBe(2);
  });

  it("returns missing_snapshot advisory details when the run has no stored inspection snapshot", async () => {
    await verdictRunRepository.saveRun({
      runId: "run:no-snapshot",
      storyId: "story:test",
      revisionId: "revision:test",
      triggerKind: "test",
      createdAt: "2026-04-10T10:05:00Z"
    });
    await verdictRepository.saveVerdict(
      verdict({
        verdictId: "verdict:no-snapshot",
        runId: "run:no-snapshot",
        verdictKind: "Repairable Gap",
        category: "causal_gap",
        explanation: "Missing bridge event.",
        evidence: evidence({
          findingId: "finding:no-snapshot",
          reasonCode: "missing_causal_link"
        }),
        createdAt: "2026-04-10T10:05:00Z"
      })
    );

    const payload = await buildRunInspectionPayload({
      runId: "run:no-snapshot",
      verdictRunRepository,
      verdictRepository
    });

    const parsed = RunInspectionResponseSchema.parse(payload);
    const detail = parsed.detailsByVerdictId["verdict:no-snapshot"];
    expect(detail.advisory).toEqual({
      status: "missing_snapshot",
      reason: "Inspection advisory snapshot is not stored for this run.",
      assessment: null,
      rerankedRepairs: [],
      repairPlausibilityAdjustments: []
    });
    expect(detail.repairs).toEqual([]);
  });

  it("returns undefined for absent runs and redacts raw prior/storage fields from DTO text", async () => {
    await seedRunWithSnapshot();

    await expect(
      buildRunInspectionPayload({
        runId: "run:missing",
        verdictRunRepository,
        verdictRepository
      })
    ).resolves.toBeUndefined();

    const payload = await buildRunInspectionPayload({
      runId: "run:current",
      verdictRunRepository,
      verdictRepository
    });
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("sourceWorkIds");
    expect(serialized).not.toContain("snapshotDir");
    expect(serialized).not.toContain("snapshotSet");
    expect(serialized).not.toContain("PriorSnapshot");
    expect(serialized).not.toContain("inspection_snapshot");
    expect(serialized).not.toContain("run_id");
  });
});
