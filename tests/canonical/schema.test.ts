import { describe, expect, it } from "vitest";

import {
  CanonicalEventSchema,
  CanonicalIdSchemas,
  CharacterEntitySchema,
  CharacterStateBoundarySchema,
  NormalizedExecutableRuleSchema,
  RulePackMetadataSchema,
  VerdictKindSchema
} from "../../src/domain/index.js";

describe("canonical domain schema", () => {
  it("exposes explicit canonical records for entities and state boundaries", () => {
    const character = CharacterEntitySchema.parse({
      entityId: "character:a",
      storyId: "story:demo",
      revisionId: "revision:1",
      entityKind: "character",
      name: "A",
      aliases: [],
      description: "Lead",
      archetypes: ["gambler"],
      defaultLoyalties: ["family"]
    });

    const boundary = CharacterStateBoundarySchema.parse({
      boundaryId: "boundary:initial",
      storyId: "story:demo",
      revisionId: "revision:1",
      characterId: character.entityId,
      sequence: 0,
      boundaryKind: "initial",
      core: {
        locationId: "place:seoul",
        aliveStatus: "alive",
        knowledge: ["A is bankrupt"],
        goals: ["Recover financially"],
        loyalties: ["family"],
        resources: ["credit line"],
        conditions: ["desperate"]
      },
      extensions: [
        {
          key: "debt_score",
          valueType: "number",
          value: 90
        }
      ]
    });

    expect(character.entityKind).toBe("character");
    expect(boundary.core.locationId).toBe("place:seoul");
    expect(boundary.core.knowledge).toContain("A is bankrupt");
    expect(boundary.extensions[0]?.key).toBe("debt_score");
  });

  it("requires canonical events to produce a state change or rule change", () => {
    const invalid = CanonicalEventSchema.safeParse({
      eventId: "event:invalid",
      storyId: "story:demo",
      revisionId: "revision:1",
      eventType: "walk",
      abstract: false,
      actorIds: ["character:a"],
      targetIds: [],
      sequence: 1,
      time: {
        relation: "after"
      },
      preconditions: [],
      effects: [],
      causalLinkIds: []
    });

    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toContain("state change or rule change");
    }
  });

  it("accepts abstract events when they change canonical state", () => {
    const betrayal = CanonicalEventSchema.parse({
      eventId: "event:betrayal",
      storyId: "story:demo",
      revisionId: "revision:1",
      eventType: "betrayal",
      abstract: true,
      actorIds: ["character:a"],
      targetIds: ["character:b"],
      sequence: 2,
      time: {
        relation: "after",
        anchorEventId: "event:rescue"
      },
      placeId: "place:newyork",
      preconditions: [
        {
          description: "B previously rescued A"
        }
      ],
      effects: [
        {
          effectId: "effect:betrayal",
          description: "A reverses loyalty under coercion",
          stateChanges: [
            {
              subjectId: "character:a",
              field: "loyalties",
              operation: "remove",
              value: "character:b"
            },
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
      causalLinkIds: ["cause:betrayal"]
    });

    expect(betrayal.abstract).toBe(true);
    expect(betrayal.effects[0]?.stateChanges).toHaveLength(2);
  });

  it("keeps rule metadata distinct from normalized executable rules", () => {
    const metadata = RulePackMetadataSchema.parse({
      rulePackId: "rulepack:reality-default",
      storyId: "story:demo",
      revisionId: "revision:1",
      name: "Reality Default",
      description: "Baseline physics",
      worldAffiliation: "baseline",
      scope: "story",
      priority: 0,
      active: true,
      sourceKind: "baseline",
      sourceText: "Reality physics is active.",
      defaultPhysics: true
    });

    const normalized = NormalizedExecutableRuleSchema.parse({
      ruleVersionId: "ruleversion:baseline-v1",
      rulePackId: metadata.rulePackId,
      executableKind: "predicate",
      executableRef: "rules/reality/baseline-v1",
      normalizedText: "Travel requires sufficient time unless an overriding rule is active.",
      conditions: ["travel_attempt"],
      effects: ["requires_min_travel_time"],
      validationStatus: "validated"
    });

    expect(metadata.sourceText).toContain("Reality physics");
    expect(normalized.executableRef).toContain("baseline-v1");
    expect(normalized.rulePackId).toBe(metadata.rulePackId);
  });

  it("exports stable verdict taxonomy and branded id schemas", () => {
    expect(VerdictKindSchema.options).toEqual([
      "Hard Contradiction",
      "Repairable Gap",
      "Soft Drift",
      "Consistent"
    ]);

    expect(CanonicalIdSchemas.story.parse("story:test")).toBe("story:test");
    expect(CanonicalIdSchemas.event.parse("event:test")).toBe("event:test");
  });
});
