import type { CorpusWork } from "../../src/corpus/index.js";

const realityWork: CorpusWork = {
  workId: "work:reality-broker",
  title: "Broker's Flight",
  genreWeights: [
    { genreKey: "thriller", weight: 0.7 },
    { genreKey: "crime", weight: 0.3 }
  ],
  worldProfile: "reality-default",
  commerciallyValidated: true,
  criticallyValidated: true,
  scenes: [
    {
      sceneId: "scene:airport",
      sequence: 1,
      summary: "A leaves Korea for a property deal in New York.",
      eventRows: [
        {
          eventId: "event:goodbye",
          eventType: "goodbye",
          sequence: 1,
          abstract: false,
          actorIds: ["character:a", "character:b"],
          targetIds: [],
          placeId: "place:incheon-airport",
          timeRelation: "before",
          preconditionTokens: [],
          stateTransitions: [
            {
              characterId: "character:a",
              axis: "goals",
              operation: "add",
              value: "buy_building"
            }
          ],
          worldRuleExceptions: []
        },
        {
          eventId: "event:flight",
          eventType: "flight_departure",
          sequence: 2,
          abstract: false,
          actorIds: ["character:a"],
          targetIds: [],
          placeId: "place:incheon-airport",
          timeRelation: "after",
          preconditionTokens: ["travel_time_available"],
          stateTransitions: [
            {
              characterId: "character:a",
              axis: "locationId",
              operation: "set",
              value: "place:newyork"
            }
          ],
          worldRuleExceptions: []
        }
      ]
    },
    {
      sceneId: "scene:meeting",
      sequence: 2,
      summary: "The deal meeting locks in capital.",
      eventRows: [
        {
          eventId: "event:meeting",
          eventType: "deal_meeting",
          sequence: 1,
          abstract: false,
          actorIds: ["character:a"],
          targetIds: ["character:broker"],
          placeId: "place:newyork",
          timeRelation: "after",
          preconditionTokens: ["funds_secured"],
          stateTransitions: [
            {
              characterId: "character:a",
              axis: "resources",
              operation: "add",
              value: "capital_commitment"
            }
          ],
          worldRuleExceptions: []
        }
      ]
    }
  ]
};

const fantasyWork: CorpusWork = {
  workId: "work:fantasy-gate",
  title: "Gate Oath",
  genreWeights: [
    { genreKey: "fantasy", weight: 0.8 },
    { genreKey: "adventure", weight: 0.2 }
  ],
  worldProfile: "fantasy-light",
  commerciallyValidated: true,
  criticallyValidated: false,
  scenes: [
    {
      sceneId: "scene:gate",
      sequence: 1,
      summary: "A mage opens a teleport gate.",
      eventRows: [
        {
          eventId: "event:spell",
          eventType: "spell_cast",
          sequence: 1,
          abstract: false,
          actorIds: ["character:mage"],
          targetIds: [],
          placeId: "place:ruins",
          timeRelation: "before",
          preconditionTokens: ["mana_focused"],
          stateTransitions: [
            {
              characterId: "character:mage",
              axis: "resources",
              operation: "remove",
              value: "mana_reserve"
            }
          ],
          worldRuleExceptions: [
            {
              token: "teleportation_enabled",
              summary: "Teleportation is permitted inside the gate circle."
            }
          ]
        },
        {
          eventId: "event:arrival",
          eventType: "instant_arrival",
          sequence: 2,
          abstract: false,
          actorIds: ["character:mage"],
          targetIds: [],
          placeId: "place:castle",
          timeRelation: "same-window",
          preconditionTokens: [],
          stateTransitions: [
            {
              characterId: "character:mage",
              axis: "locationId",
              operation: "set",
              value: "place:castle"
            }
          ],
          worldRuleExceptions: [
            {
              token: "teleportation_enabled",
              summary: "Teleport arrival ignores default travel duration."
            }
          ]
        }
      ]
    },
    {
      sceneId: "scene:oath",
      sequence: 2,
      summary: "The mage swears loyalty to the rebels.",
      eventRows: [
        {
          eventId: "event:oath",
          eventType: "oath",
          sequence: 1,
          abstract: false,
          actorIds: ["character:mage"],
          targetIds: ["faction:rebels"],
          placeId: "place:castle",
          timeRelation: "after",
          preconditionTokens: ["witnessed_injustice"],
          stateTransitions: [
            {
              characterId: "character:mage",
              axis: "loyalties",
              operation: "add",
              value: "rebels"
            },
            {
              characterId: "character:mage",
              axis: "conditions",
              operation: "add",
              value: "wanted_by_crown"
            }
          ],
          worldRuleExceptions: []
        }
      ]
    }
  ]
};

export function buildCorpusPriorFixtures(): CorpusWork[] {
  return [realityWork, fantasyWork];
}
