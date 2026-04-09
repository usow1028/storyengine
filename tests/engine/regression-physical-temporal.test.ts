import { describe, expect, it } from "vitest";

import { evaluateEventPath } from "../../src/engine/index.js";
import {
  buildImpossibleTravelFixture,
  buildInvalidTemporalAnchorFixture,
  buildRestrictedEntryFixture
} from "../fixtures/hard-constraint-fixtures.js";

describe("physical and temporal regression coverage", () => {
  it("locks impossible_travel behind a representative time contradiction", async () => {
    const fixture = buildImpossibleTravelFixture();
    const evaluation = await evaluateEventPath(fixture);

    expect(evaluation.verdictKind).toBe("Hard Contradiction");
    expect(evaluation.representativeChecker).toBe("time");
    expect(evaluation.reasonCode).toBe("impossible_travel");
    expect(evaluation.findings.map((finding) => finding.reasonCode)).toContain("impossible_travel");
    expect(evaluation.notEvaluated.map((item) => item.checker)).toEqual(["causality", "character"]);
  });

  it("flags invalid temporal anchors before downstream reasoning", async () => {
    const fixture = buildInvalidTemporalAnchorFixture();
    const evaluation = await evaluateEventPath(fixture);

    expect(evaluation.verdictKind).toBe("Hard Contradiction");
    expect(evaluation.representativeChecker).toBe("time");
    expect(evaluation.reasonCode).toBe("invalid_temporal_anchor");
    expect(evaluation.findings[0]?.reasonCode).toBe("invalid_temporal_anchor");
    expect(evaluation.notEvaluated.map((item) => item.checker)).toEqual(["causality", "character"]);
  });

  it("keeps physical_rule_blocked movement as a hard regression fixture", async () => {
    const fixture = buildRestrictedEntryFixture();
    const evaluation = await evaluateEventPath(fixture);

    expect(evaluation.verdictKind).toBe("Hard Contradiction");
    expect(evaluation.representativeChecker).toBe("physics");
    expect(evaluation.reasonCode).toBe("physical_rule_blocked");
    expect(evaluation.findings.map((finding) => finding.reasonCode)).toContain("physical_rule_blocked");
    expect(evaluation.notEvaluated.map((item) => item.checker)).toEqual(["causality", "character"]);
  });
});
