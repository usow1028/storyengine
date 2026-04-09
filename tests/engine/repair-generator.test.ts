import { describe, expect, it } from "vitest";

import type { RepairSource } from "../../src/engine/index.js";
import { generateRepairCandidates } from "../../src/engine/index.js";
import {
  buildExplainedVerdictRecord,
  evaluateEventPath
} from "../../src/services/index.js";
import {
  buildImpossibleTravelFixture,
  buildMissingCauseFixture
} from "../fixtures/hard-constraint-fixtures.js";

async function buildRepairSource(
  fixture: Parameters<typeof evaluateEventPath>[0],
  sourceFindingId: string
): Promise<RepairSource> {
  const evaluation = await evaluateEventPath(fixture);
  const verdict = buildExplainedVerdictRecord({
    graph: fixture.graph,
    eventId: fixture.eventId,
    evaluation,
    availableRules: fixture.availableRules,
    boundaryFactsByCharacterId: fixture.boundaryFactsByCharacterId,
    verdictId: `verdict:${sourceFindingId}`,
    createdAt: "2026-04-09T11:20:00Z"
  });

  return {
    sourceFindingId,
    reasonCode: verdict.evidence.reasonCode ?? "unknown",
    category: verdict.category,
    verdictKind: verdict.verdictKind,
    evidence: verdict.evidence
  };
}

describe("repair generator", () => {
  it("emits add_missing_assumption or add_prior_event for missing_causal_link", async () => {
    const source = await buildRepairSource(buildMissingCauseFixture(), "finding:missing_causal_link");
    const repairs = generateRepairCandidates({ sources: [source] });

    expect(source.reasonCode).toBe("missing_causal_link");
    expect(repairs.map((repair) => repair.repairType)).toEqual(
      expect.arrayContaining(["add_missing_assumption", "add_prior_event"])
    );
  });

  it("emits declare_rule or prior-departure repairs for impossible_travel and caps output at 3", async () => {
    const source = await buildRepairSource(buildImpossibleTravelFixture(), "finding:impossible_travel");
    const repairs = generateRepairCandidates({ sources: [source] });

    expect(source.reasonCode).toBe("impossible_travel");
    expect(repairs.map((repair) => repair.repairType)).toEqual(
      expect.arrayContaining(["declare_rule", "add_prior_event"])
    );
    expect(repairs).toHaveLength(3);
  });

  it("merges duplicate repairs while preserving multiple sourceFindingIds", async () => {
    const left = await buildRepairSource(buildMissingCauseFixture(), "finding:left");
    const right = await buildRepairSource(buildMissingCauseFixture(), "finding:right");
    const repairs = generateRepairCandidates({ sources: [left, right] });

    expect(repairs[0]?.sourceFindingIds).toEqual(
      expect.arrayContaining(["finding:left", "finding:right"])
    );
  });

  it("does not generate repairs for notEvaluated findings", async () => {
    const fixture = buildImpossibleTravelFixture();
    const evaluation = await evaluateEventPath(fixture);
    const verdict = buildExplainedVerdictRecord({
      graph: fixture.graph,
      eventId: fixture.eventId,
      evaluation,
      availableRules: fixture.availableRules,
      boundaryFactsByCharacterId: fixture.boundaryFactsByCharacterId,
      verdictId: "verdict:blocked-only",
      createdAt: "2026-04-09T11:25:00Z"
    });

    const blockedSources: RepairSource[] = verdict.evidence.notEvaluated.map((finding, index) => ({
      sourceFindingId: `finding:blocked:${index}`,
      reasonCode: finding.blockedByReasonCode,
      evidence: verdict.evidence,
      blocked: true
    }));

    expect(generateRepairCandidates({ sources: blockedSources })).toEqual([]);
  });
});
