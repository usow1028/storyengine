import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InspectionShell } from "../../src/ui/components/InspectionShell.js";
import type { RunInspectionResponse } from "../../src/ui/types.js";

function sampleInspectionResponse(): RunInspectionResponse {
  return {
    run: {
      runId: "run:ui",
      storyId: "story:ui",
      revisionId: "revision:ui",
      previousRunId: null,
      triggerKind: "test",
      createdAt: "2026-04-10T10:15:00Z"
    },
    groups: [
      {
        verdictKind: "Hard Contradiction",
        count: 1,
        verdicts: [
          {
            verdictId: "verdict:hard",
            verdictKind: "Hard Contradiction",
            category: "temporal_contradiction",
            explanation: "A character cannot cross the ocean instantly.",
            findingId: "finding:hard",
            reasonCode: "impossible_travel",
            relatedEventIds: ["event:airport", "event:meeting"],
            eventCount: 2,
            repairCandidateCount: 1,
            createdAt: "2026-04-10T10:15:01Z"
          }
        ]
      },
      {
        verdictKind: "Repairable Gap",
        count: 0,
        verdicts: []
      },
      {
        verdictKind: "Soft Drift",
        count: 0,
        verdicts: []
      },
      {
        verdictKind: "Consistent",
        count: 0,
        verdicts: []
      }
    ],
    selectedVerdictId: null,
    detailsByVerdictId: {
      "verdict:hard": {
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
          provenanceIds: [],
          conflictPath: ["event:airport", "event:meeting"],
          missingPremises: [],
          supportingFindings: [],
          notEvaluated: []
        },
        timeline: [],
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
        createdAt: "2026-04-10T10:15:01Z"
      }
    },
    diff: null
  };
}

describe("InspectionShell", () => {
  it("renders split-view triage before deterministic detail from the inspection DTO", () => {
    const html = renderToStaticMarkup(
      createElement(InspectionShell, { data: sampleInspectionResponse() })
    );

    expect(html).toContain("Inspection Console");
    expect(html).toContain("Verdict Triage");
    expect(html).toContain("Inspect Verdict");
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
      html.indexOf("Repair Candidates")
    );

    expect(html).toContain("Rank 1");
    expect(html).toContain("finding:hard");
    const blockedText = [
      "dangerouslySet" + "InnerHTML",
      "Ap" + "ply",
      "Ac" + "cept",
      "Re" + "write",
      "Auto" + "-fix"
    ];
    expect(blockedText.some((word) => html.includes(word))).toBe(false);
  });
});
