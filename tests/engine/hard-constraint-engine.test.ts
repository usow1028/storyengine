import { describe, expect, it } from "vitest";

import {
  aggregateFindings,
  evaluateEventPath,
  type ActiveRuleSnapshot,
  type CharacterBoundaryFacts
} from "../../src/engine/index.js";
import type { CanonicalEvent } from "../../src/domain/index.js";
import type { CanonicalStoryGraph } from "../../src/storage/index.js";

function buildRule(options: {
  rulePackId: string;
  ruleVersionId: string;
  scope: "global" | "story" | "location" | "character" | "event";
  scopeTargetId?: string;
  worldAffiliation: string;
  effects?: string[];
  active?: boolean;
}) {
  return {
    metadata: {
      rulePackId: options.rulePackId,
      storyId: "story:test",
      revisionId: "revision:test",
      name: options.rulePackId,
      description: options.rulePackId,
      worldAffiliation: options.worldAffiliation,
      scope: options.scope,
      scopeTargetId: options.scopeTargetId,
      priority: 0,
      active: options.active ?? true,
      sourceKind: "baseline",
      sourceText: options.rulePackId,
      defaultPhysics: options.scope === "global"
    },
    version: {
      ruleVersionId: options.ruleVersionId,
      rulePackId: options.rulePackId,
      executableKind: "predicate",
      executableRef: options.ruleVersionId,
      normalizedText: options.ruleVersionId,
      conditions: [],
      effects: options.effects ?? [],
      validationStatus: "validated"
    }
  } satisfies ActiveRuleSnapshot;
}

function createGraph(events: CanonicalEvent[]): CanonicalStoryGraph {
  return {
    story: {
      storyId: "story:test",
      title: "test",
      description: "",
      defaultRulePackName: "reality-default"
    },
    revision: {
      revisionId: "revision:test",
      storyId: "story:test",
      sourceKind: "manual",
      createdAt: "2026-04-09T10:00:00Z"
    },
    entities: [
      {
        entityId: "character:a",
        storyId: "story:test",
        revisionId: "revision:test",
        entityKind: "character",
        name: "A",
        aliases: [],
        description: "",
        archetypes: [],
        defaultLoyalties: ["character:b"]
      },
      {
        entityId: "character:b",
        storyId: "story:test",
        revisionId: "revision:test",
        entityKind: "character",
        name: "B",
        aliases: [],
        description: "",
        archetypes: [],
        defaultLoyalties: []
      },
      {
        entityId: "place:seoul",
        storyId: "story:test",
        revisionId: "revision:test",
        entityKind: "place",
        name: "Seoul",
        aliases: [],
        description: "",
        movementClass: "normal"
      },
      {
        entityId: "place:newyork",
        storyId: "story:test",
        revisionId: "revision:test",
        entityKind: "place",
        name: "New York",
        aliases: [],
        description: "",
        movementClass: "normal"
      }
    ],
    stateBoundaries: [],
    events,
    causalLinks: []
  };
}

function boundaryFacts(overrides?: Partial<CharacterBoundaryFacts>): CharacterBoundaryFacts {
  return {
    characterId: "character:a",
    locationId: "place:seoul",
    aliveStatus: "alive",
    knowledge: [],
    goals: [],
    loyalties: ["character:b"],
    resources: [],
    conditions: [],
    stateBoundaryIds: ["boundary:a"],
    sourceEventIds: [],
    provenanceIds: [],
    ...overrides
  };
}

describe("hard constraint engine", () => {
  it("produces a hard contradiction and marks downstream checkers as not evaluated for impossible travel", async () => {
    const previousEvent: CanonicalEvent = {
      eventId: "event:airport",
      storyId: "story:test",
      revisionId: "revision:test",
      eventType: "airport",
      abstract: false,
      actorIds: ["character:a"],
      targetIds: [],
      sequence: 1,
      time: { relation: "after", durationMinutes: 0 },
      placeId: "place:seoul",
      preconditions: [],
      effects: [
        {
          effectId: "effect:airport",
          description: "",
          stateChanges: [
            {
              subjectId: "character:a",
              field: "locationId",
              operation: "set",
              value: "place:seoul"
            }
          ],
          ruleChanges: []
        }
      ],
      causalLinkIds: []
    };
    const event: CanonicalEvent = {
      eventId: "event:meeting",
      storyId: "story:test",
      revisionId: "revision:test",
      eventType: "meeting",
      abstract: false,
      actorIds: ["character:a"],
      targetIds: [],
      sequence: 2,
      time: { relation: "same-window", durationMinutes: 0, minTravelMinutes: 840 },
      placeId: "place:newyork",
      preconditions: [],
      effects: [
        {
          effectId: "effect:meeting",
          description: "",
          stateChanges: [
            {
              subjectId: "character:a",
              field: "locationId",
              operation: "set",
              value: "place:newyork"
            }
          ],
          ruleChanges: []
        }
      ],
      causalLinkIds: []
    };

    const evaluation = await evaluateEventPath({
      graph: createGraph([previousEvent, event]),
      eventId: "event:meeting",
      availableRules: [
        buildRule({
          rulePackId: "rulepack:reality",
          ruleVersionId: "ruleversion:reality",
          scope: "global",
          worldAffiliation: "movement"
        })
      ],
      boundaryFactsByCharacterId: {
        "character:a": boundaryFacts()
      }
    });

    expect(evaluation.verdictKind).toBe("Hard Contradiction");
    expect(evaluation.representativeChecker).toBe("time");
    expect(evaluation.notEvaluated.map((item) => item.checker)).toEqual(["causality", "character"]);
  });

  it("keeps a betrayal-under-threat scenario non-hard", async () => {
    const previousEvent: CanonicalEvent = {
      eventId: "event:threat",
      storyId: "story:test",
      revisionId: "revision:test",
      eventType: "threat",
      abstract: true,
      actorIds: ["character:b"],
      targetIds: ["character:a"],
      sequence: 1,
      time: { relation: "after" },
      placeId: "place:seoul",
      preconditions: [],
      effects: [
        {
          effectId: "effect:threat",
          description: "",
          stateChanges: [
            {
              subjectId: "character:a",
              field: "conditions",
              operation: "add",
              value: "under_family_threat"
            }
          ],
          ruleChanges: []
        }
      ],
      causalLinkIds: []
    };
    const event: CanonicalEvent = {
      eventId: "event:betrayal",
      storyId: "story:test",
      revisionId: "revision:test",
      eventType: "betrayal",
      abstract: true,
      actorIds: ["character:a"],
      targetIds: ["character:b"],
      sequence: 2,
      time: { relation: "after" },
      placeId: "place:seoul",
      preconditions: [],
      effects: [
        {
          effectId: "effect:betrayal",
          description: "",
          stateChanges: [
            {
              subjectId: "character:a",
              field: "loyalties",
              operation: "remove",
              value: "character:b"
            }
          ],
          ruleChanges: []
        }
      ],
      causalLinkIds: []
    };

    const evaluation = await evaluateEventPath({
      graph: createGraph([previousEvent, event]),
      eventId: "event:betrayal",
      availableRules: [],
      boundaryFactsByCharacterId: {
        "character:a": boundaryFacts({ conditions: ["under_family_threat"] })
      }
    });

    expect(evaluation.verdictKind).not.toBe("Hard Contradiction");
  });

  it("changes the representative verdict when an event-level override is active", async () => {
    const previousEvent: CanonicalEvent = {
      eventId: "event:airport",
      storyId: "story:test",
      revisionId: "revision:test",
      eventType: "airport",
      abstract: false,
      actorIds: ["character:a"],
      targetIds: [],
      sequence: 1,
      time: { relation: "after", durationMinutes: 0 },
      placeId: "place:seoul",
      preconditions: [],
      effects: [
        {
          effectId: "effect:airport",
          description: "",
          stateChanges: [
            {
              subjectId: "character:a",
              field: "locationId",
              operation: "set",
              value: "place:seoul"
            }
          ],
          ruleChanges: []
        }
      ],
      causalLinkIds: []
    };
    const event: CanonicalEvent = {
      eventId: "event:teleport",
      storyId: "story:test",
      revisionId: "revision:test",
      eventType: "teleport",
      abstract: false,
      actorIds: ["character:a"],
      targetIds: [],
      sequence: 2,
      time: { relation: "same-window", durationMinutes: 0, minTravelMinutes: 840 },
      placeId: "place:newyork",
      preconditions: [],
      effects: [
        {
          effectId: "effect:teleport",
          description: "",
          stateChanges: [
            {
              subjectId: "character:a",
              field: "locationId",
              operation: "set",
              value: "place:newyork"
            }
          ],
          ruleChanges: []
        }
      ],
      causalLinkIds: []
    };
    const graph = createGraph([previousEvent, event]);

    const withoutOverride = await evaluateEventPath({
      graph,
      eventId: "event:teleport",
      availableRules: [
        buildRule({
          rulePackId: "rulepack:story-default",
          ruleVersionId: "ruleversion:story-default",
          scope: "story",
          worldAffiliation: "movement"
        })
      ],
      boundaryFactsByCharacterId: {
        "character:a": boundaryFacts()
      }
    });

    const withOverride = await evaluateEventPath({
      graph,
      eventId: "event:teleport",
      availableRules: [
        buildRule({
          rulePackId: "rulepack:story-default",
          ruleVersionId: "ruleversion:story-default",
          scope: "story",
          worldAffiliation: "movement"
        }),
        buildRule({
          rulePackId: "rulepack:event-override",
          ruleVersionId: "ruleversion:event-override",
          scope: "event",
          scopeTargetId: "event:teleport",
          worldAffiliation: "movement",
          effects: ["instant_travel"]
        })
      ],
      boundaryFactsByCharacterId: {
        "character:a": boundaryFacts()
      }
    });

    expect(withoutOverride.verdictKind).toBe("Hard Contradiction");
    expect(withOverride.verdictKind).toBe("Consistent");
  });

  it("prefers the highest-severity finding as the representative verdict", () => {
    const evaluation = aggregateFindings({
      findings: [
        {
          checker: "causality",
          reasonCode: "missing_causal_link",
          category: "causal_gap",
          verdictKind: "Repairable Gap",
          explanation: "Missing cause",
          evidence: {
            eventIds: ["event:a"],
            stateBoundaryIds: [],
            ruleVersionIds: [],
            provenanceIds: []
          }
        },
        {
          checker: "time",
          reasonCode: "impossible_travel",
          category: "temporal_contradiction",
          verdictKind: "Hard Contradiction",
          explanation: "Impossible travel",
          evidence: {
            eventIds: ["event:b"],
            stateBoundaryIds: [],
            ruleVersionIds: [],
            provenanceIds: []
          }
        }
      ],
      notEvaluated: []
    });

    expect(evaluation.verdictKind).toBe("Hard Contradiction");
    expect(evaluation.representativeChecker).toBe("time");
  });
});
