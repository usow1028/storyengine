import { describe, expect, it } from "vitest";

import {
  runCausalityChecks,
  runCharacterChecks,
  runPhysicsChecks,
  runSpaceChecks,
  runTimeChecks,
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
  effects?: string[];
  conditions?: string[];
  normalizedText?: string;
}): ActiveRuleSnapshot {
  return {
    metadata: {
      rulePackId: options.rulePackId,
      storyId: "story:test",
      revisionId: "revision:test",
      name: options.rulePackId,
      description: options.rulePackId,
      worldAffiliation: "baseline",
      scope: options.scope,
      scopeTargetId: options.scopeTargetId,
      priority: 0,
      active: true,
      sourceKind: "baseline",
      sourceText: options.rulePackId,
      defaultPhysics: options.scope === "global"
    },
    version: {
      ruleVersionId: options.ruleVersionId,
      rulePackId: options.rulePackId,
      executableKind: "predicate",
      executableRef: options.ruleVersionId,
      normalizedText: options.normalizedText ?? "",
      conditions: options.conditions ?? [],
      effects: options.effects ?? [],
      validationStatus: "validated"
    }
  };
}

function baseGraph(): CanonicalStoryGraph {
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
      },
      {
        entityId: "place:vault",
        storyId: "story:test",
        revisionId: "revision:test",
        entityKind: "place",
        name: "Vault",
        aliases: [],
        description: "",
        movementClass: "restricted"
      }
    ],
    stateBoundaries: [],
    events: [],
    causalLinks: []
  };
}

function buildBoundaryFacts(overrides?: Partial<CharacterBoundaryFacts>): CharacterBoundaryFacts {
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

describe("checker families", () => {
  it("flags impossible travel in the time checker", () => {
    const graph = baseGraph();
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

    const findings = runTimeChecks({
      graph: { ...graph, events: [previousEvent, event] },
      event,
      previousEvent,
      activeRules: [buildRule({ rulePackId: "rulepack:reality", ruleVersionId: "ruleversion:reality", scope: "global" })]
    });

    expect(findings[0]?.reasonCode).toBe("impossible_travel");
    expect(findings[0]?.verdictKind).toBe("Hard Contradiction");
  });

  it("emits a repairable location-context gap in the space checker", () => {
    const graph = baseGraph();
    const previousEvent: CanonicalEvent = {
      eventId: "event:unknown",
      storyId: "story:test",
      revisionId: "revision:test",
      eventType: "unknown",
      abstract: false,
      actorIds: ["character:a"],
      targetIds: [],
      sequence: 1,
      time: { relation: "after" },
      preconditions: [],
      effects: [
        {
          effectId: "effect:unknown",
          description: "",
          stateChanges: [
            {
              subjectId: "character:a",
              field: "conditions",
              operation: "add",
              value: "moving"
            }
          ],
          ruleChanges: []
        }
      ],
      causalLinkIds: []
    };
    const event: CanonicalEvent = {
      eventId: "event:arrival",
      storyId: "story:test",
      revisionId: "revision:test",
      eventType: "arrival",
      abstract: false,
      actorIds: ["character:a"],
      targetIds: [],
      sequence: 2,
      time: { relation: "after" },
      placeId: "place:newyork",
      preconditions: [],
      effects: [
        {
          effectId: "effect:arrival",
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

    const findings = runSpaceChecks({
      graph: { ...graph, events: [previousEvent, event] },
      event,
      previousEvent,
      activeRules: []
    });

    expect(findings[0]?.reasonCode).toBe("missing_location_context");
    expect(findings[0]?.verdictKind).toBe("Repairable Gap");
  });

  it("blocks physics violations for dead actors", () => {
    const graph = baseGraph();
    const event: CanonicalEvent = {
      eventId: "event:return",
      storyId: "story:test",
      revisionId: "revision:test",
      eventType: "return",
      abstract: false,
      actorIds: ["character:a"],
      targetIds: [],
      sequence: 1,
      time: { relation: "after" },
      placeId: "place:seoul",
      preconditions: [],
      effects: [
        {
          effectId: "effect:return",
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

    const findings = runPhysicsChecks({
      graph: { ...graph, events: [event] },
      event,
      activeRules: [],
      boundaryFactsByCharacterId: {
        "character:a": buildBoundaryFacts({ aliveStatus: "dead" })
      }
    });

    expect(findings[0]?.reasonCode).toBe("physical_rule_blocked");
    expect(findings[0]?.verdictKind).toBe("Hard Contradiction");
  });

  it("reports missing causal links for major outcomes", () => {
    const graph = baseGraph();
    const event: CanonicalEvent = {
      eventId: "event:betrayal",
      storyId: "story:test",
      revisionId: "revision:test",
      eventType: "betrayal",
      abstract: true,
      actorIds: ["character:a"],
      targetIds: ["character:b"],
      sequence: 1,
      time: { relation: "after" },
      placeId: "place:newyork",
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

    const findings = runCausalityChecks({
      graph: { ...graph, events: [event] },
      event,
      activeRules: []
    });

    expect(findings[0]?.reasonCode).toBe("missing_causal_link");
    expect(findings[0]?.verdictKind).toBe("Repairable Gap");
  });

  it("flags unexplained loyalty reversals in the character checker", () => {
    const graph = baseGraph();
    const event: CanonicalEvent = {
      eventId: "event:betrayal",
      storyId: "story:test",
      revisionId: "revision:test",
      eventType: "betrayal",
      abstract: true,
      actorIds: ["character:a"],
      targetIds: ["character:b"],
      sequence: 1,
      time: { relation: "after" },
      placeId: "place:newyork",
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

    const findings = runCharacterChecks({
      graph: { ...graph, events: [event] },
      event,
      activeRules: [],
      boundaryFactsByCharacterId: {
        "character:a": buildBoundaryFacts()
      }
    });

    expect(findings[0]?.reasonCode).toBe("loyalty_reversal_without_cause");
    expect(findings[0]?.verdictKind).toBe("Hard Contradiction");
  });

  it("does not produce a hard contradiction when a counter-motive exists", () => {
    const graph = baseGraph();
    const event: CanonicalEvent = {
      eventId: "event:betrayal",
      storyId: "story:test",
      revisionId: "revision:test",
      eventType: "betrayal",
      abstract: true,
      actorIds: ["character:a"],
      targetIds: ["character:b"],
      sequence: 1,
      time: { relation: "after" },
      placeId: "place:newyork",
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

    const findings = runCharacterChecks({
      graph: { ...graph, events: [event] },
      event,
      activeRules: [],
      boundaryFactsByCharacterId: {
        "character:a": buildBoundaryFacts({
          conditions: ["under_family_threat"]
        })
      }
    });

    expect(findings.find((finding) => finding.verdictKind === "Hard Contradiction")).toBeUndefined();
  });
});
