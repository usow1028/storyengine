import type { CanonicalEvent, CausalLink } from "../../src/domain/index.js";
import type {
  ActiveRuleSnapshot,
  CharacterBoundaryFacts
} from "../../src/engine/index.js";
import type { CanonicalStoryGraph } from "../../src/storage/index.js";

const STORY_ID = "story:test";
const REVISION_ID = "revision:test";

export interface HardConstraintFixture {
  graph: CanonicalStoryGraph;
  eventId: string;
  availableRules: ActiveRuleSnapshot[];
  boundaryFactsByCharacterId: Record<string, CharacterBoundaryFacts>;
}

function buildRule(options: {
  rulePackId: string;
  ruleVersionId: string;
  scope: "global" | "story" | "location" | "character" | "event";
  scopeTargetId?: string;
  priority?: number;
  active?: boolean;
  worldAffiliation: string;
  effects?: string[];
}) {
  return {
    metadata: {
      rulePackId: options.rulePackId,
      storyId: STORY_ID,
      revisionId: REVISION_ID,
      name: options.rulePackId,
      description: options.rulePackId,
      worldAffiliation: options.worldAffiliation,
      scope: options.scope,
      scopeTargetId: options.scopeTargetId,
      priority: options.priority ?? 0,
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

function baseGraph(events: CanonicalEvent[], options?: { causalLinks?: CausalLink[] }) {
  const graph: CanonicalStoryGraph = {
    story: {
      storyId: STORY_ID,
      title: "test",
      description: "",
      defaultRulePackName: "reality-default"
    },
    revision: {
      revisionId: REVISION_ID,
      storyId: STORY_ID,
      sourceKind: "manual",
      createdAt: "2026-04-09T10:00:00Z"
    },
    entities: [
      {
        entityId: "character:a",
        storyId: STORY_ID,
        revisionId: REVISION_ID,
        entityKind: "character",
        name: "A",
        aliases: [],
        description: "",
        archetypes: [],
        defaultLoyalties: ["character:b"]
      },
      {
        entityId: "character:b",
        storyId: STORY_ID,
        revisionId: REVISION_ID,
        entityKind: "character",
        name: "B",
        aliases: [],
        description: "",
        archetypes: [],
        defaultLoyalties: []
      },
      {
        entityId: "place:seoul",
        storyId: STORY_ID,
        revisionId: REVISION_ID,
        entityKind: "place",
        name: "Seoul",
        aliases: [],
        description: "",
        movementClass: "normal"
      },
      {
        entityId: "place:newyork",
        storyId: STORY_ID,
        revisionId: REVISION_ID,
        entityKind: "place",
        name: "New York",
        aliases: [],
        description: "",
        movementClass: "normal"
      },
      {
        entityId: "place:vault",
        storyId: STORY_ID,
        revisionId: REVISION_ID,
        entityKind: "place",
        name: "Vault",
        aliases: [],
        description: "",
        movementClass: "restricted"
      }
    ],
    stateBoundaries: [],
    events,
    causalLinks: options?.causalLinks ?? []
  };

  return graph;
}

function boundaryFacts(
  overrides?: Partial<CharacterBoundaryFacts>
): Record<string, CharacterBoundaryFacts> {
  return {
    "character:a": {
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
    }
  };
}

export function buildImpossibleTravelFixture(): HardConstraintFixture {
  const graph = baseGraph([
    {
      eventId: "event:airport",
      storyId: STORY_ID,
      revisionId: REVISION_ID,
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
    },
    {
      eventId: "event:meeting",
      storyId: STORY_ID,
      revisionId: REVISION_ID,
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
    }
  ]);

  return {
    graph,
    eventId: "event:meeting",
    availableRules: [
      buildRule({
        rulePackId: "rulepack:reality",
        ruleVersionId: "ruleversion:reality",
        scope: "global",
        worldAffiliation: "movement"
      })
    ],
    boundaryFactsByCharacterId: boundaryFacts()
  };
}

export function buildInvalidTemporalAnchorFixture(): HardConstraintFixture {
  const graph = baseGraph([
    {
      eventId: "event:anchored",
      storyId: STORY_ID,
      revisionId: REVISION_ID,
      eventType: "anchored",
      abstract: false,
      actorIds: ["character:a"],
      targetIds: [],
      sequence: 1,
      time: { relation: "after", anchorEventId: "event:missing-anchor" },
      placeId: "place:seoul",
      preconditions: [],
      effects: [
        {
          effectId: "effect:anchored",
          description: "",
          stateChanges: [
            {
              subjectId: "character:a",
              field: "goals",
              operation: "add",
              value: "close_deal"
            }
          ],
          ruleChanges: []
        }
      ],
      causalLinkIds: []
    }
  ]);

  return {
    graph,
    eventId: "event:anchored",
    availableRules: [],
    boundaryFactsByCharacterId: boundaryFacts()
  };
}

export function buildRestrictedEntryFixture(): HardConstraintFixture {
  const graph = baseGraph([
    {
      eventId: "event:intrusion",
      storyId: STORY_ID,
      revisionId: REVISION_ID,
      eventType: "intrusion",
      abstract: false,
      actorIds: ["character:a"],
      targetIds: [],
      sequence: 1,
      time: { relation: "after" },
      placeId: "place:vault",
      preconditions: [],
      effects: [
        {
          effectId: "effect:intrusion",
          description: "",
          stateChanges: [
            {
              subjectId: "character:a",
              field: "locationId",
              operation: "set",
              value: "place:vault"
            }
          ],
          ruleChanges: []
        }
      ],
      causalLinkIds: []
    }
  ]);

  return {
    graph,
    eventId: "event:intrusion",
    availableRules: [
      buildRule({
        rulePackId: "rulepack:reality-access",
        ruleVersionId: "ruleversion:reality-access",
        scope: "global",
        worldAffiliation: "access"
      })
    ],
    boundaryFactsByCharacterId: boundaryFacts()
  };
}

export function buildMissingCauseFixture(): HardConstraintFixture {
  const graph = baseGraph([
    {
      eventId: "event:betrayal-declared",
      storyId: STORY_ID,
      revisionId: REVISION_ID,
      eventType: "betrayal",
      abstract: true,
      actorIds: ["character:a"],
      targetIds: [],
      sequence: 1,
      time: { relation: "after" },
      placeId: "place:seoul",
      preconditions: [],
      effects: [
        {
          effectId: "effect:betrayal-declared",
          description: "",
          stateChanges: [
            {
              subjectId: "character:a",
              field: "goals",
              operation: "add",
              value: "seize_control"
            }
          ],
          ruleChanges: []
        }
      ],
      causalLinkIds: []
    }
  ]);

  return {
    graph,
    eventId: "event:betrayal-declared",
    availableRules: [],
    boundaryFactsByCharacterId: boundaryFacts()
  };
}

export function buildBetrayalWithoutJustificationFixture(): HardConstraintFixture {
  const graph = baseGraph([
    {
      eventId: "event:oath",
      storyId: STORY_ID,
      revisionId: REVISION_ID,
      eventType: "oath",
      abstract: true,
      actorIds: ["character:a"],
      targetIds: ["character:b"],
      sequence: 1,
      time: { relation: "after" },
      placeId: "place:seoul",
      preconditions: [],
      effects: [
        {
          effectId: "effect:oath",
          description: "",
          stateChanges: [
            {
              subjectId: "character:a",
              field: "loyalties",
              operation: "add",
              value: "character:b"
            }
          ],
          ruleChanges: []
        }
      ],
      causalLinkIds: []
    },
    {
      eventId: "event:betrayal",
      storyId: STORY_ID,
      revisionId: REVISION_ID,
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
    }
  ]);

  return {
    graph,
    eventId: "event:betrayal",
    availableRules: [],
    boundaryFactsByCharacterId: boundaryFacts()
  };
}

export function buildBetrayalUnderThreatFixture(): HardConstraintFixture {
  const graph = baseGraph([
    {
      eventId: "event:threat",
      storyId: STORY_ID,
      revisionId: REVISION_ID,
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
    },
    {
      eventId: "event:betrayal",
      storyId: STORY_ID,
      revisionId: REVISION_ID,
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
    }
  ]);

  return {
    graph,
    eventId: "event:betrayal",
    availableRules: [],
    boundaryFactsByCharacterId: boundaryFacts({ conditions: ["under_family_threat"] })
  };
}

export function buildRuleOverrideFixture(options?: {
  includeEventOverride?: boolean;
  localRuleActive?: boolean;
  explicitActivation?: boolean;
}): HardConstraintFixture {
  const includeEventOverride = options?.includeEventOverride ?? false;
  const localRuleActive = options?.localRuleActive ?? true;
  const explicitActivation = options?.explicitActivation ?? false;

  const graph = baseGraph([
    {
      eventId: "event:airport",
      storyId: STORY_ID,
      revisionId: REVISION_ID,
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
    },
    {
      eventId: "event:teleport",
      storyId: STORY_ID,
      revisionId: REVISION_ID,
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
          ruleChanges: explicitActivation
            ? [
                {
                  ruleVersionId: "ruleversion:event-override",
                  operation: "activate"
                }
              ]
            : []
        }
      ],
      causalLinkIds: []
    }
  ]);

  const availableRules: ActiveRuleSnapshot[] = [
    buildRule({
      rulePackId: "rulepack:story-default",
      ruleVersionId: "ruleversion:story-default",
      scope: "story",
      worldAffiliation: "movement"
    })
  ];

  if (includeEventOverride) {
    availableRules.push(
      buildRule({
        rulePackId: "rulepack:event-override",
        ruleVersionId: "ruleversion:event-override",
        scope: "event",
        scopeTargetId: "event:teleport",
        worldAffiliation: "movement",
        active: localRuleActive,
        effects: ["instant_travel"]
      })
    );
  }

  return {
    graph,
    eventId: "event:teleport",
    availableRules,
    boundaryFactsByCharacterId: boundaryFacts()
  };
}
