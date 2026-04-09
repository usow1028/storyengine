import { describe, expect, it } from "vitest";

import { normalizeCorpusTransition, normalizeCorpusWork } from "../../src/corpus/index.js";
import { buildCorpusPriorFixtures } from "../fixtures/corpus-prior-fixtures.js";

describe("corpus normalization", () => {
  it("normalizes individual transitions into canonical event/state tokens", () => {
    const [realityWork] = buildCorpusPriorFixtures();
    const scene = realityWork?.scenes[0];
    const current = scene?.eventRows[0];
    const next = scene?.eventRows[1];

    expect(scene).toBeDefined();
    expect(current).toBeDefined();
    expect(next).toBeDefined();

    const transition = normalizeCorpusTransition({
      work: realityWork!,
      current: current!,
      next: next!
    });

    expect(transition.currentEventType).toBe("goodbye");
    expect(transition.nextEventType).toBe("flight_departure");
    expect(transition.preconditionTokens).toContain("travel_time_available");
    expect(transition.stateTransitionTokens).toContain("locationId:set:place:newyork");
  });

  it("preserves world-rule exception tokens during normalization", () => {
    const [, fantasyWork] = buildCorpusPriorFixtures();
    const normalized = normalizeCorpusWork(fantasyWork!);

    // world-rule exception tokens must survive corpus normalization.
    expect(normalized.transitions[0]?.worldRuleExceptionTokens).toContain(
      "teleportation_enabled"
    );
    expect(normalized.transitions[0]?.worldProfile).toBe("fantasy-light");
  });

  it("keeps motivation-sensitive state axes on later transitions", () => {
    const [, fantasyWork] = buildCorpusPriorFixtures();
    const normalized = normalizeCorpusWork(fantasyWork!);
    const oathTransition = normalized.transitions.find(
      (transition) => transition.nextEventId === "event:oath"
    );

    expect(oathTransition?.stateAxes).toEqual(
      expect.arrayContaining(["conditions", "loyalties"])
    );
    expect(oathTransition?.stateTransitionTokens).toEqual(
      expect.arrayContaining(["loyalties:add:rebels", "conditions:add:wanted_by_crown"])
    );
  });
});
