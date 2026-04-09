import { beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import {
  applyCanonicalSchema,
  StoryRepository
} from "../../src/storage/index.js";
import type { CanonicalStoryGraph } from "../../src/storage/index.js";
import {
  SnapshotRebuilder,
  StoryBoundaryQueryService
} from "../../src/services/index.js";

function createTestClient() {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  return { pool };
}

function buildStoryGraphFixture(): CanonicalStoryGraph {
  return {
    story: {
      storyId: "story:reconstruction",
      title: "Reconstruction Fixture",
      description: "Story used for boundary reconstruction",
      defaultRulePackName: "reality-default"
    },
    revision: {
      revisionId: "revision:reconstruction-1",
      storyId: "story:reconstruction",
      sourceKind: "manual",
      createdAt: "2026-04-09T06:40:00Z"
    },
    entities: [
      {
        entityId: "character:a",
        storyId: "story:reconstruction",
        revisionId: "revision:reconstruction-1",
        entityKind: "character",
        name: "A",
        aliases: [],
        description: "Lead",
        archetypes: ["survivor"],
        defaultLoyalties: ["family"]
      },
      {
        entityId: "place:seoul",
        storyId: "story:reconstruction",
        revisionId: "revision:reconstruction-1",
        entityKind: "place",
        name: "Seoul",
        aliases: [],
        description: "Origin",
        movementClass: "normal"
      },
      {
        entityId: "place:newyork",
        storyId: "story:reconstruction",
        revisionId: "revision:reconstruction-1",
        entityKind: "place",
        name: "New York",
        aliases: [],
        description: "Destination",
        movementClass: "normal"
      }
    ],
    stateBoundaries: [
      {
        boundaryId: "boundary:a-initial",
        storyId: "story:reconstruction",
        revisionId: "revision:reconstruction-1",
        characterId: "character:a",
        sequence: 0,
        boundaryKind: "initial",
        core: {
          locationId: "place:seoul",
          aliveStatus: "alive",
          knowledge: ["B helped A"],
          goals: ["Buy a building"],
          loyalties: ["family"],
          resources: ["plane ticket"],
          conditions: ["hopeful"]
        },
        extensions: [],
        provenanceId: "prov:initial"
      }
    ],
    events: [
      {
        eventId: "event:travel",
        storyId: "story:reconstruction",
        revisionId: "revision:reconstruction-1",
        eventType: "travel",
        abstract: false,
        actorIds: ["character:a"],
        targetIds: [],
        sequence: 1,
        time: {
          relation: "after",
          durationMinutes: 840,
          minTravelMinutes: 840
        },
        placeId: "place:newyork",
        preconditions: [],
        effects: [
          {
            effectId: "effect:travel",
            description: "A arrives",
            stateChanges: [
              {
                subjectId: "character:a",
                field: "locationId",
                operation: "set",
                value: "place:newyork",
                provenanceId: "prov:travel"
              }
            ],
            ruleChanges: []
          }
        ],
        causalLinkIds: []
      },
      {
        eventId: "event:threat",
        storyId: "story:reconstruction",
        revisionId: "revision:reconstruction-1",
        eventType: "threat",
        abstract: true,
        actorIds: ["character:a"],
        targetIds: [],
        sequence: 2,
        time: {
          relation: "after",
          anchorEventId: "event:travel"
        },
        placeId: "place:newyork",
        preconditions: [],
        effects: [
          {
            effectId: "effect:threat",
            description: "A's knowledge and goals shift under pressure",
            stateChanges: [
              {
                subjectId: "character:a",
                field: "knowledge",
                operation: "add",
                value: "Family is under threat",
                provenanceId: "prov:threat"
              },
              {
                subjectId: "character:a",
                field: "goals",
                operation: "add",
                value: "Protect family first",
                provenanceId: "prov:threat"
              },
              {
                subjectId: "character:a",
                field: "conditions",
                operation: "add",
                value: "coerced",
                provenanceId: "prov:threat"
              }
            ],
            ruleChanges: []
          }
        ],
        causalLinkIds: []
      }
    ],
    causalLinks: []
  };
}

describe("story boundary reconstruction", () => {
  let pool: Pool;

  beforeEach(async () => {
    const created = createTestClient();
    pool = created.pool;
    await applyCanonicalSchema(pool);
    await new StoryRepository(pool).saveGraph(buildStoryGraphFixture());
  });

  it("distinguishes before-event and after-event snapshots", async () => {
    const service = new StoryBoundaryQueryService(
      new SnapshotRebuilder(new StoryRepository(pool))
    );

    const beforeTravel = await service.queryCharacterFacts({
      storyId: "story:reconstruction",
      revisionId: "revision:reconstruction-1",
      characterId: "character:a",
      targetEventId: "event:travel",
      position: "before"
    });

    const afterTravel = await service.queryCharacterFacts({
      storyId: "story:reconstruction",
      revisionId: "revision:reconstruction-1",
      characterId: "character:a",
      targetEventId: "event:travel",
      position: "after"
    });

    expect(beforeTravel.locationId).toBe("place:seoul");
    expect(afterTravel.locationId).toBe("place:newyork");
    expect(afterTravel.provenanceIds).toContain("prov:travel");
    expect(afterTravel.sourceEventIds).toContain("event:travel");
  });

  it("answers knowledge and goals at the selected story boundary", async () => {
    const service = new StoryBoundaryQueryService(
      new SnapshotRebuilder(new StoryRepository(pool))
    );

    const beforeThreat = await service.queryCharacterFacts({
      storyId: "story:reconstruction",
      revisionId: "revision:reconstruction-1",
      characterId: "character:a",
      targetEventId: "event:threat",
      position: "before"
    });

    const afterThreat = await service.queryCharacterFacts({
      storyId: "story:reconstruction",
      revisionId: "revision:reconstruction-1",
      characterId: "character:a",
      targetEventId: "event:threat",
      position: "after"
    });

    expect(beforeThreat.knowledge).not.toContain("Family is under threat");
    expect(afterThreat.knowledge).toContain("Family is under threat");
    expect(afterThreat.goals).toContain("Protect family first");
    expect(afterThreat.conditions).toContain("coerced");
    expect(afterThreat.provenanceIds).toContain("prov:threat");
  });
});
