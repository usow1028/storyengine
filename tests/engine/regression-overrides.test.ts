import { describe, expect, it } from "vitest";

import { evaluateEventPath } from "../../src/engine/index.js";
import { buildRuleOverrideFixture } from "../fixtures/hard-constraint-fixtures.js";

describe("override regression coverage", () => {
  it("keeps baseline reality-default behavior hard without an override", async () => {
    const fixture = buildRuleOverrideFixture();
    const evaluation = await evaluateEventPath(fixture);

    expect(evaluation.verdictKind).toBe("Hard Contradiction");
    expect(evaluation.representativeChecker).toBe("time");
    expect(evaluation.reasonCode).toBe("impossible_travel");
  });

  it("keeps event-specific override winning over story-level default", async () => {
    const fixture = buildRuleOverrideFixture({ includeEventOverride: true });
    const evaluation = await evaluateEventPath(fixture);

    expect(evaluation.verdictKind).toBe("Consistent");
    expect(evaluation.findings).toEqual([]);
    expect(evaluation.notEvaluated).toEqual([]);
  });

  it("keeps inactive local rule inactive until explicitly activated", async () => {
    const inactiveFixture = buildRuleOverrideFixture({
      includeEventOverride: true,
      localRuleActive: false
    });
    const activatedFixture = buildRuleOverrideFixture({
      includeEventOverride: true,
      localRuleActive: false,
      explicitActivation: true
    });

    const withoutActivation = await evaluateEventPath(inactiveFixture);
    const withActivation = await evaluateEventPath(activatedFixture);

    expect(withoutActivation.verdictKind).toBe("Hard Contradiction");
    expect(withoutActivation.reasonCode).toBe("impossible_travel");
    expect(withActivation.verdictKind).toBe("Consistent");
  });
});
