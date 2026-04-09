import { describe, expect, it } from "vitest";

import { resolveActiveRuleSet, type ActiveRuleSnapshot } from "../../src/engine/index.js";

function buildRule(options: {
  rulePackId: string;
  ruleVersionId: string;
  scope: "global" | "story" | "location" | "character" | "event";
  scopeTargetId?: string;
  priority: number;
  active: boolean;
  worldAffiliation: string;
  effects?: string[];
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
      priority: options.priority,
      active: options.active,
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

describe("resolveActiveRuleSet", () => {
  it("event-specific override beats story default", () => {
    const activeRules = resolveActiveRuleSet({
      eventId: "event:teleport",
      actorIds: ["character:a"],
      placeId: "place:newyork",
      availableRules: [
        buildRule({
          rulePackId: "rulepack:story-default",
          ruleVersionId: "ruleversion:story-default",
          scope: "story",
          priority: 0,
          active: true,
          worldAffiliation: "movement"
        }),
        buildRule({
          rulePackId: "rulepack:event-override",
          ruleVersionId: "ruleversion:event-override",
          scope: "event",
          scopeTargetId: "event:teleport",
          priority: 10,
          active: true,
          worldAffiliation: "movement",
          effects: ["instant_travel"]
        })
      ],
      explicitRuleChanges: []
    });

    expect(activeRules).toHaveLength(1);
    expect(activeRules[0]?.version?.ruleVersionId).toBe("ruleversion:event-override");
  });

  it("location rule beats story default", () => {
    const activeRules = resolveActiveRuleSet({
      eventId: "event:arrive",
      actorIds: ["character:a"],
      placeId: "place:vault",
      availableRules: [
        buildRule({
          rulePackId: "rulepack:story-default",
          ruleVersionId: "ruleversion:story-default",
          scope: "story",
          priority: 0,
          active: true,
          worldAffiliation: "access"
        }),
        buildRule({
          rulePackId: "rulepack:vault-rule",
          ruleVersionId: "ruleversion:vault-rule",
          scope: "location",
          scopeTargetId: "place:vault",
          priority: 5,
          active: true,
          worldAffiliation: "access",
          effects: ["allow_restricted_entry"]
        })
      ],
      explicitRuleChanges: []
    });

    expect(activeRules[0]?.version?.ruleVersionId).toBe("ruleversion:vault-rule");
  });

  it("inactive local rule stays inactive until activated", () => {
    const availableRules = [
      buildRule({
        rulePackId: "rulepack:story-default",
        ruleVersionId: "ruleversion:story-default",
        scope: "story",
        priority: 0,
        active: true,
        worldAffiliation: "movement"
      }),
      buildRule({
        rulePackId: "rulepack:event-override",
        ruleVersionId: "ruleversion:event-override",
        scope: "event",
        scopeTargetId: "event:teleport",
        priority: 10,
        active: false,
        worldAffiliation: "movement",
        effects: ["instant_travel"]
      })
    ];

    const withoutActivation = resolveActiveRuleSet({
      eventId: "event:teleport",
      actorIds: ["character:a"],
      placeId: "place:newyork",
      availableRules,
      explicitRuleChanges: []
    });

    const withActivation = resolveActiveRuleSet({
      eventId: "event:teleport",
      actorIds: ["character:a"],
      placeId: "place:newyork",
      availableRules,
      explicitRuleChanges: [
        {
          ruleVersionId: "ruleversion:event-override",
          operation: "activate"
        }
      ]
    });

    expect(withoutActivation).toHaveLength(1);
    expect(withoutActivation[0]?.version?.ruleVersionId).toBe("ruleversion:story-default");
    expect(withActivation[0]?.version?.ruleVersionId).toBe("ruleversion:event-override");
  });
});
