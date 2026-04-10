import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InspectionShell } from "../../src/ui/components/InspectionShell.js";
import { SoftPriorAdvisoryBand } from "../../src/ui/components/SoftPriorAdvisoryBand.js";
import type { InspectionVerdictDetail, RunInspectionResponse } from "../../src/ui/types.js";

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
          missingPremises: [
            {
              kind: "missing_prior_event",
              description: "The transoceanic flight must be established before arrival."
            },
            {
              kind: "missing_context",
              description: "The elapsed time window must be visible to the reader."
            },
            {
              kind: "missing_anchor",
              description: "The arrival event needs an anchor before the meeting."
            },
            {
              kind: "missing_assumption",
              description: "Teleportation is not declared as a world exception."
            },
            {
              kind: "missing_rule",
              description: "No override rule permits instant travel."
            },
            {
              kind: "missing_prior_event",
              description: "Airport departure does not imply completed ocean crossing."
            },
            {
              kind: "missing_context",
              description: "The route between cities is not summarized."
            }
          ],
          supportingFindings: [],
          notEvaluated: []
        },
        timeline: [
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
          },
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
            relatedStateBoundaryIds: [],
            relatedRuleVersionIds: [],
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
      html.indexOf("Event Timeline")
    );
    expect(html.indexOf("Airport departure evidence")).toBeLessThan(
      html.indexOf("Meeting arrival evidence")
    );
    expect(html).toContain("Show Structured Trace");
    expect(html.indexOf("Event Timeline")).toBeLessThan(
      html.indexOf("Repair Candidates")
    );
    expect(html.indexOf("Repair Candidates")).toBeLessThan(
      html.indexOf("Advisory Pattern Signal")
    );
    expect(html).toContain(
      "Pattern signal unavailable. Deterministic verdict still applies."
    );
    expect(html).toContain("Pattern signal only. Hard verdict remains deterministic.");

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
