import { describe, expect, it } from "vitest";

import {
  buildExplainedVerdictRecord,
  evaluateEventPath
} from "../../src/services/index.js";
import {
  buildBetrayalUnderThreatFixture,
  buildImpossibleTravelFixture
} from "../fixtures/hard-constraint-fixtures.js";

describe("evidence traces", () => {
  it("captures impossible travel evidence with event and rule summaries", async () => {
    const fixture = buildImpossibleTravelFixture();
    const evaluation = await evaluateEventPath(fixture);
    const verdict = buildExplainedVerdictRecord({
      graph: fixture.graph,
      eventId: fixture.eventId,
      evaluation,
      availableRules: fixture.availableRules,
      boundaryFactsByCharacterId: fixture.boundaryFactsByCharacterId,
      verdictId: "verdict:impossible-travel",
      createdAt: "2026-04-09T11:00:00Z"
    });

    expect(verdict.evidence.eventSummaries.map((summary) => summary.eventId)).toEqual([
      "event:airport",
      "event:meeting"
    ]);
    expect(verdict.evidence.ruleSummaries[0]?.ruleVersionId).toBe("ruleversion:reality");
    expect(verdict.evidence.conflictPath).toEqual(["event:airport", "event:meeting"]);
  });

  it("captures betrayal under threat with relevant state summaries and the immediate prior state change", async () => {
    const fixture = buildBetrayalUnderThreatFixture();
    const evaluation = await evaluateEventPath(fixture);
    const verdict = buildExplainedVerdictRecord({
      graph: fixture.graph,
      eventId: fixture.eventId,
      evaluation,
      availableRules: fixture.availableRules,
      boundaryFactsByCharacterId: fixture.boundaryFactsByCharacterId,
      verdictId: "verdict:betrayal-under-threat",
      createdAt: "2026-04-09T11:05:00Z"
    });

    const actorSummary = verdict.evidence.stateSummaries.find(
      (summary) => summary.characterId === "character:a"
    );

    expect(actorSummary?.relevantAxes).toContain("loyalties");
    expect(actorSummary?.relevantAxes).toContain("conditions");
    expect(actorSummary?.values.conditions).toContain("under_family_threat");
    expect(actorSummary?.previousSourceEventId).toBe("event:threat");
  });

  it("keeps notEvaluated checkers visible in the rendered explanation path", async () => {
    const fixture = buildImpossibleTravelFixture();
    const evaluation = await evaluateEventPath(fixture);
    const verdict = buildExplainedVerdictRecord({
      graph: fixture.graph,
      eventId: fixture.eventId,
      evaluation,
      availableRules: fixture.availableRules,
      boundaryFactsByCharacterId: fixture.boundaryFactsByCharacterId,
      verdictId: "verdict:blocked-checks",
      createdAt: "2026-04-09T11:10:00Z"
    });

    expect(verdict.evidence.notEvaluated.map((finding) => finding.checker)).toEqual([
      "causality",
      "character"
    ]);
    expect(verdict.explanation).toContain("Blocked checks:");
    expect(verdict.explanation).toContain("causality blocked by time(impossible_travel)");
    expect(verdict.explanation).toContain("character blocked by time(impossible_travel)");
  });
});
