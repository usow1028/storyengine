import { CanonicalEntitySchema, CanonicalEventSchema } from "../../src/domain/index.js";
import type { StructuredExtractionEnvelope } from "../../src/services/ingestion-llm-client.js";

type ExtractionCandidate = StructuredExtractionEnvelope["candidates"][number];

export function buildSoftPriorCheckCandidates(
  sessionId: string,
  segmentId: string
): ExtractionCandidate[] {
  const storyId = `story:draft:${sessionId}`;
  const revisionId = `revision:draft:${sessionId}`;
  const mage = CanonicalEntitySchema.parse({
    entityId: "character:mage",
    storyId,
    revisionId,
    entityKind: "character",
    name: "Mage",
    aliases: [],
    description: "A mage who can activate local teleportation.",
    archetypes: ["mage"],
    defaultLoyalties: []
  });
  const spell = CanonicalEventSchema.parse({
    eventId: `event:${sessionId}:spell`,
    storyId,
    revisionId,
    eventType: "spell_cast",
    abstract: false,
    actorIds: ["character:mage"],
    targetIds: [],
    sequence: 0,
    time: {
      relation: "before"
    },
    placeId: "place:ruins",
    preconditions: [],
    effects: [
      {
        effectId: `effect:${sessionId}:spell:mana`,
        description: "The spell consumes the mage's mana reserve.",
        stateChanges: [
          {
            subjectId: "character:mage",
            field: "resources",
            operation: "remove",
            value: "mana_reserve"
          }
        ],
        ruleChanges: [
          {
            ruleVersionId: "teleportation_enabled",
            operation: "declare"
          }
        ]
      }
    ],
    causalLinkIds: []
  });
  const arrival = CanonicalEventSchema.parse({
    eventId: `event:${sessionId}:arrival`,
    storyId,
    revisionId,
    eventType: "instant_arrival",
    abstract: false,
    actorIds: ["character:mage"],
    targetIds: [],
    sequence: 1,
    time: {
      relation: "same-window",
      durationMinutes: 0,
      minTravelMinutes: 480
    },
    placeId: "place:castle",
    preconditions: [],
    effects: [
      {
        effectId: `effect:${sessionId}:arrival:location`,
        description: "The mage arrives at the castle immediately.",
        stateChanges: [
          {
            subjectId: "character:mage",
            field: "locationId",
            operation: "set",
            value: "place:castle"
          }
        ],
        ruleChanges: [
          {
            ruleVersionId: "teleportation_enabled",
            operation: "declare"
          }
        ]
      }
    ],
    causalLinkIds: []
  });

  return [
    {
      candidateId: `${segmentId}:entity:mage`,
      candidateKind: "entity",
      canonicalKey: mage.entityId,
      confidence: 0.98,
      sourceSpanStart: 0,
      sourceSpanEnd: 12,
      provenanceDetail: { source: "soft-prior-ingestion-fixture" },
      payload: mage
    },
    {
      candidateId: `${segmentId}:event:spell`,
      candidateKind: "event",
      canonicalKey: spell.eventId,
      confidence: 0.97,
      sourceSpanStart: 13,
      sourceSpanEnd: 64,
      provenanceDetail: { source: "soft-prior-ingestion-fixture" },
      payload: spell
    },
    {
      candidateId: `${segmentId}:event:arrival`,
      candidateKind: "event",
      canonicalKey: arrival.eventId,
      confidence: 0.97,
      sourceSpanStart: 65,
      sourceSpanEnd: 128,
      provenanceDetail: { source: "soft-prior-ingestion-fixture" },
      payload: arrival
    }
  ];
}
