import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_INSPECTION_FILTERS,
  InspectionShell,
  filterInspectionGroups
} from "../../src/ui/components/InspectionShell.js";
import { SoftPriorAdvisoryBand } from "../../src/ui/components/SoftPriorAdvisoryBand.js";
import type {
  InspectionVerdictDetail,
  InspectionVerdictSummary,
  RunInspectionResponse
} from "../../src/ui/types.js";

function hardVerdictSummary(): InspectionVerdictSummary {
  return {
    verdictId: "verdict:hard",
    verdictKind: "Hard Contradiction",
    category: "temporal_contradiction",
    explanation: "A character cannot cross the ocean instantly.",
    findingId: "finding:hard",
    reasonCode: "impossible_travel",
    relatedEventIds: ["event:airport", "event:meeting"],
    eventCount: 2,
    repairCandidateCount: 1,
    createdAt: "2026-04-10T10:15:01Z",
    secondaryGroup: {
      groupKey: "chapter:draft-document:ui-inspection:chapter-1",
      label: "Chapter 1",
      kind: "chapter",
      sectionId: "draft-section:ui:chapter-1",
      documentId: "draft-document:ui-inspection"
    },
    provenanceSummary: {
      provenanceId: "provenance:ui-hard",
      sessionId: "session:ui",
      segmentId: "segment:ui:1",
      segmentLabel: "Arrival beat 1",
      reviewState: "stale",
      sectionId: "draft-section:ui:chapter-1",
      sectionLabel: "Chapter 1",
      sectionKind: "chapter",
      sourceSpans: [
        {
          sourceKind: "ingestion_session_raw_text",
          sessionId: "session:ui",
          startOffset: 0,
          endOffset: 28,
          textNormalization: "lf"
        }
      ]
    }
  };
}

function softVerdictSummary(): InspectionVerdictSummary {
  return {
    verdictId: "verdict:soft",
    verdictKind: "Soft Drift",
    category: "provenance_gap",
    explanation: "Arrival motivation still needs explicit setup.",
    findingId: "finding:soft",
    reasonCode: "motivation_drift",
    relatedEventIds: ["event:meeting"],
    eventCount: 1,
    repairCandidateCount: 0,
    createdAt: "2026-04-10T10:15:02Z",
    secondaryGroup: {
      groupKey: "chapter:draft-document:ui-inspection:chapter-2",
      label: "Chapter 2",
      kind: "chapter",
      sectionId: "draft-section:ui:chapter-2",
      documentId: "draft-document:ui-inspection"
    },
    provenanceSummary: {
      provenanceId: "provenance:ui-soft",
      sessionId: "session:ui",
      segmentId: "segment:ui:2",
      segmentLabel: "Arrival beat 2",
      reviewState: "approved",
      sectionId: "draft-section:ui:chapter-2",
      sectionLabel: "Chapter 2",
      sectionKind: "chapter",
      sourceSpans: [
        {
          sourceKind: "ingestion_session_raw_text",
          sessionId: "session:ui",
          startOffset: 29,
          endOffset: 56,
          textNormalization: "lf"
        }
      ]
    }
  };
}

function hardDetail(): InspectionVerdictDetail {
  return {
    verdictId: "verdict:hard",
    verdictKind: "Hard Contradiction",
    category: "temporal_contradiction",
    explanation: "A character cannot cross the ocean instantly.",
    deterministicVerdict: {
      verdictId: "verdict:hard",
      verdictKind: "Hard Contradiction",
      category: "temporal_contradiction",
      explanation: "A character cannot cross the ocean instantly.",
      findingId: "finding:hard",
      representativeChecker: "time",
      reasonCode: "impossible_travel",
      createdAt: "2026-04-10T10:15:01Z"
    },
    evidenceSummary: {
      summary: "The airport event and meeting event cannot share the stated window.",
      eventCount: 2,
      stateCount: 1,
      ruleCount: 1,
      missingPremiseCount: 1,
      supportingFindingCount: 0,
      relatedEventIds: ["event:airport", "event:meeting"]
    },
    trace: {
      findingId: "finding:hard",
      representativeChecker: "time",
      reasonCode: "impossible_travel",
      eventIds: ["event:airport", "event:meeting"],
      stateBoundaryIds: ["boundary:location"],
      ruleVersionIds: ["ruleversion:reality"],
      provenanceIds: ["provenance:ui-hard"],
      conflictPath: ["event:airport", "event:meeting"],
      missingPremises: [
        {
          kind: "missing_prior_event",
          description: "The transoceanic flight must be established before arrival."
        }
      ],
      supportingFindings: [],
      notEvaluated: []
    },
    timeline: [
      {
        eventId: "event:airport",
        sequence: 1,
        eventType: "airport",
        summary: "Airport departure evidence",
        abstract: false,
        actorIds: ["character:a"],
        targetIds: [],
        placeId: "place:seoul",
        timeRelation: "before",
        relatedStateBoundaryIds: ["boundary:location"],
        relatedRuleVersionIds: ["ruleversion:reality"],
        conflictPath: ["event:airport", "event:meeting"]
      },
      {
        eventId: "event:meeting",
        sequence: 2,
        eventType: "meeting",
        summary: "Meeting arrival evidence",
        abstract: false,
        actorIds: ["character:a"],
        targetIds: ["character:b"],
        placeId: "place:tokyo",
        timeRelation: "after",
        relatedStateBoundaryIds: ["boundary:location"],
        relatedRuleVersionIds: ["ruleversion:reality"],
        conflictPath: ["event:airport", "event:meeting"]
      }
    ],
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
    stateSummaries: [
      {
        characterId: "character:a",
        stateBoundaryId: "boundary:location",
        relevantAxes: ["locationId"],
        values: {
          locationId: "place:seoul",
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
    repairs: [
      {
        repairId: "repair:flight",
        repairType: "add_prior_event",
        reasonCode: "impossible_travel",
        sourceFindingIds: ["finding:hard"],
        confidenceBand: "medium",
        summary: "Add an explicit flight before the meeting.",
        payload: {
          insertBeforeEventId: "event:meeting",
          anchorEventId: "event:airport",
          eventType: "flight",
          summary: "The character boards a long flight.",
          expectedEffect: "Travel time becomes explicit before the meeting."
        },
        plausibilityAdjustment: {
          repairId: "repair:flight",
          adjustment: 0.25,
          confidence: 0.8,
          dominantPriorLayer: "baseline",
          representativePatternSummary: "Long-distance arrivals usually need travel setup."
        }
      }
    ],
    advisory: {
      status: "missing_snapshot",
      reason: "Pattern signal unavailable.",
      assessment: null,
      rerankedRepairs: [],
      repairPlausibilityAdjustments: []
    },
    diff: null,
    sourceContext: {
      provenanceIds: ["provenance:ui-hard"],
      sessionId: "session:ui",
      segmentId: "segment:ui:1",
      segmentLabel: "Arrival beat 1",
      reviewState: "stale",
      sectionId: "draft-section:ui:chapter-1",
      sectionLabel: "Chapter 1",
      sectionKind: "chapter",
      sourceSpans: [
        {
          sourceKind: "ingestion_session_raw_text",
          sessionId: "session:ui",
          startOffset: 0,
          endOffset: 28,
          textNormalization: "lf"
        }
      ]
    },
    createdAt: "2026-04-10T10:15:01Z"
  };
}

function softDetail(): InspectionVerdictDetail {
  return {
    verdictId: "verdict:soft",
    verdictKind: "Soft Drift",
    category: "provenance_gap",
    explanation: "Arrival motivation still needs explicit setup.",
    deterministicVerdict: {
      verdictId: "verdict:soft",
      verdictKind: "Soft Drift",
      category: "provenance_gap",
      explanation: "Arrival motivation still needs explicit setup.",
      findingId: "finding:soft",
      representativeChecker: "character",
      reasonCode: "motivation_drift",
      createdAt: "2026-04-10T10:15:02Z"
    },
    evidenceSummary: {
      summary: "The current approval path leaves motivation setup implicit.",
      eventCount: 1,
      stateCount: 0,
      ruleCount: 0,
      missingPremiseCount: 0,
      supportingFindingCount: 0,
      relatedEventIds: ["event:meeting"]
    },
    trace: {
      findingId: "finding:soft",
      representativeChecker: "character",
      reasonCode: "motivation_drift",
      eventIds: ["event:meeting"],
      stateBoundaryIds: [],
      ruleVersionIds: [],
      provenanceIds: ["provenance:ui-soft"],
      conflictPath: ["event:meeting"],
      missingPremises: [],
      supportingFindings: [],
      notEvaluated: []
    },
    timeline: [],
    eventSummaries: [],
    stateSummaries: [],
    ruleSummaries: [],
    repairs: [],
    advisory: {
      status: "missing_snapshot",
      reason: "Pattern signal unavailable.",
      assessment: null,
      rerankedRepairs: [],
      repairPlausibilityAdjustments: []
    },
    diff: null,
    sourceContext: {
      provenanceIds: ["provenance:ui-soft"],
      sessionId: "session:ui",
      segmentId: "segment:ui:2",
      segmentLabel: "Arrival beat 2",
      reviewState: "approved",
      sectionId: "draft-section:ui:chapter-2",
      sectionLabel: "Chapter 2",
      sectionKind: "chapter",
      sourceSpans: [
        {
          sourceKind: "ingestion_session_raw_text",
          sessionId: "session:ui",
          startOffset: 29,
          endOffset: 56,
          textNormalization: "lf"
        }
      ]
    },
    createdAt: "2026-04-10T10:15:02Z"
  };
}

function sampleInspectionResponse(): RunInspectionResponse {
  return {
    run: {
      runId: "run:ui",
      storyId: "story:ui",
      revisionId: "revision:ui",
      previousRunId: null,
      triggerKind: "test",
      createdAt: "2026-04-10T10:15:00Z",
      scopeSummary: {
        scopeId: "scope:ui",
        scopeKind: "full_approved_draft",
        comparisonScopeKey: "full:draft-document:ui-inspection",
        documentId: "draft-document:ui-inspection",
        draftRevisionId: "draft-revision:ui-inspection",
        segmentCount: 2,
        eventCount: 2,
        sourceTextRefCount: 2
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
    },
    groups: [
      {
        verdictKind: "Hard Contradiction",
        count: 1,
        verdicts: [hardVerdictSummary()]
      },
      {
        verdictKind: "Repairable Gap",
        count: 0,
        verdicts: []
      },
      {
        verdictKind: "Soft Drift",
        count: 1,
        verdicts: [softVerdictSummary()]
      },
      {
        verdictKind: "Consistent",
        count: 0,
        verdicts: []
      }
    ],
    selectedVerdictId: null,
    detailsByVerdictId: {
      "verdict:hard": hardDetail(),
      "verdict:soft": softDetail()
    },
    diff: null
  };
}

describe("InspectionShell", () => {
  it("renders operational warning banner and grouped triage metadata for large runs", () => {
    const html = renderToStaticMarkup(
      createElement(InspectionShell, { data: sampleInspectionResponse() })
    );

    expect(html).toContain("Inspection Console");
    expect(html).toContain("Mixed-state warning banner");
    expect(html).toContain("total warnings");
    expect(html).toContain("Chapter or section filter");
    expect(html).toContain("Review state filter");
    expect(html).toContain("Segment filter");
    expect(html).toContain("Chapter 1");
    expect(html).toContain("Arrival beat 1");
    expect(html).toContain("Source Context");
    expect(html).toContain("0-28");
    expect(html).toContain("aria-current=\"true\"");

    expect(html.indexOf("Hard Contradiction")).toBeLessThan(
      html.indexOf("Repairable Gap")
    );
    expect(html.indexOf("Repairable Gap")).toBeLessThan(html.indexOf("Soft Drift"));
    expect(html.indexOf("Soft Drift")).toBeLessThan(html.indexOf("Consistent"));

    expect(html.indexOf("Deterministic Verdict")).toBeLessThan(
      html.indexOf("Evidence Summary")
    );
    expect(html.indexOf("Evidence Summary")).toBeLessThan(
      html.indexOf("Event Timeline")
    );
    expect(html.indexOf("Event Timeline")).toBeLessThan(
      html.indexOf("Source Context")
    );
    expect(html.indexOf("Source Context")).toBeLessThan(
      html.indexOf("Repair Candidates")
    );
  });

  it("applies global filter state without replacing verdict-kind ordering", () => {
    const filtered = filterInspectionGroups(sampleInspectionResponse().groups, {
      ...DEFAULT_INSPECTION_FILTERS,
      groupKey: "chapter:draft-document:ui-inspection:chapter-2",
      reviewState: "approved"
    });

    expect(filtered.map((group) => group.verdictKind)).toEqual([
      "Hard Contradiction",
      "Repairable Gap",
      "Soft Drift",
      "Consistent"
    ]);
    expect(filtered.map((group) => group.count)).toEqual([0, 0, 1, 0]);
    expect(filtered[2].verdicts[0]?.verdictId).toBe("verdict:soft");
    expect(filtered[2].verdicts[0]?.secondaryGroup?.label).toBe("Chapter 2");
  });

  it("renders available advisory data as a separate pattern signal", () => {
    const advisory: InspectionVerdictDetail["advisory"] = {
      status: "available",
      assessment: {
        driftScores: {
          transition_drift: 0.76,
          motivation_drift: 0.2,
          rule_exception_rarity: 0.15
        },
        thresholds: {
          transition_drift: 0.6,
          motivation_drift: 0.6,
          rule_exception_rarity: 0.6
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
            sampleCount: 18,
            confidence: 0.8,
            appliedWeight: 1,
            score: 0.76,
            threshold: 0.6,
            patternKey: "pattern:travel-setup",
            representativePatternSummary: "Travel setup commonly precedes arrival."
          }
        ]
      },
      rerankedRepairs: [],
      repairPlausibilityAdjustments: [
        {
          repairId: "repair:flight",
          adjustment: 0.25,
          confidence: 0.8,
          dominantPriorLayer: "baseline",
          representativePatternSummary: "Adding a flight is a plausible bridge."
        }
      ]
    };

    const html = renderToStaticMarkup(
      createElement(SoftPriorAdvisoryBand, { advisory })
    );

    expect(html).toContain("Advisory Pattern Signal");
    expect(html).toContain("Pattern signal only. Hard verdict remains deterministic.");
    expect(html).toContain("transition_drift");
    expect(html).toContain("Travel setup commonly precedes arrival.");
    expect(html).toContain("repair:flight");
    expect(html).not.toContain("sourceWorkIds");
    expect(html).not.toContain("snapshotDir");
    expect(html).not.toContain("snapshotSet");
    expect(html).not.toContain("reality-default");
  });
});
