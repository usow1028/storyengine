import { describe, expect, it } from "vitest";

import { evaluateEventPath } from "../../src/engine/index.js";
import {
  buildBetrayalUnderThreatFixture,
  buildBetrayalWithoutJustificationFixture,
  buildMissingCauseFixture
} from "../fixtures/hard-constraint-fixtures.js";

describe("causality and character regression coverage", () => {
  it("keeps missing_causal_link as the canonical repairable gap", async () => {
    const fixture = buildMissingCauseFixture();
    const evaluation = await evaluateEventPath(fixture);

    expect(evaluation.verdictKind).toBe("Repairable Gap");
    expect(evaluation.representativeChecker).toBe("causality");
    expect(evaluation.reasonCode).toBe("missing_causal_link");
    expect(evaluation.findings.map((finding) => finding.reasonCode)).toEqual(["missing_causal_link"]);
    expect(evaluation.notEvaluated).toEqual([]);
  });

  it("keeps unexplained loyalty reversal as a hard character contradiction", async () => {
    const fixture = buildBetrayalWithoutJustificationFixture();
    const evaluation = await evaluateEventPath(fixture);

    expect(evaluation.verdictKind).toBe("Hard Contradiction");
    expect(evaluation.representativeChecker).toBe("character");
    expect(evaluation.reasonCode).toBe("loyalty_reversal_without_cause");
    expect(evaluation.findings.map((finding) => finding.reasonCode)).toContain(
      "loyalty_reversal_without_cause"
    );
  });

  it("keeps betrayal-under-threat non-hard", async () => {
    const fixture = buildBetrayalUnderThreatFixture();
    const evaluation = await evaluateEventPath(fixture);

    expect(evaluation.verdictKind).not.toBe("Hard Contradiction");
    expect(evaluation.findings.map((finding) => finding.reasonCode)).not.toContain(
      "loyalty_reversal_without_cause"
    );
    expect(evaluation.notEvaluated).toEqual([]);
  });
});
