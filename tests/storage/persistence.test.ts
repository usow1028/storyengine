import { beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import {
  applyCanonicalSchema,
  ProvenanceRepository,
  RuleRepository,
  StoryRepository,
  VerdictRunRepository,
  VerdictRepository,
  canonicalTableNames,
  loadCanonicalMigrationSql,
  type CanonicalStoryGraph
} from "../../src/storage/index.js";

function createTestClient() {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  return { memory, pool };
}

function buildStoryGraphFixture(): CanonicalStoryGraph {
  return {
    story: {
      storyId: "story:fixture",
      title: "Fixture Story",
      description: "A canonical storage fixture",
      defaultRulePackName: "reality-default"
    },
    revision: {
      revisionId: "revision:fixture-1",
      storyId: "story:fixture",
      sourceKind: "manual",
      createdAt: "2026-04-09T06:30:00Z"
    },
    entities: [
      {
        entityId: "character:a",
        storyId: "story:fixture",
        revisionId: "revision:fixture-1",
        entityKind: "character",
        name: "A",
        aliases: [],
        description: "Lead",
        archetypes: ["survivor"],
        defaultLoyalties: ["family"]
      },
      {
        entityId: "character:b",
        storyId: "story:fixture",
        revisionId: "revision:fixture-1",
        entityKind: "character",
        name: "B",
        aliases: [],
        description: "Benefactor",
        archetypes: ["mentor"],
        defaultLoyalties: ["A"]
      },
      {
        entityId: "place:seoul",
        storyId: "story:fixture",
        revisionId: "revision:fixture-1",
        entityKind: "place",
        name: "Seoul",
        aliases: [],
        description: "Origin city",
        movementClass: "normal"
      },
      {
        entityId: "place:newyork",
        storyId: "story:fixture",
        revisionId: "revision:fixture-1",
        entityKind: "place",
        name: "New York",
        aliases: [],
        description: "Destination city",
        movementClass: "normal"
      }
    ],
    stateBoundaries: [
      {
        boundaryId: "boundary:a-initial",
        storyId: "story:fixture",
        revisionId: "revision:fixture-1",
        characterId: "character:a",
        sequence: 0,
        boundaryKind: "initial",
        core: {
          locationId: "place:seoul",
          aliveStatus: "alive",
          knowledge: ["B helped A recover"],
          goals: ["Buy a building"],
          loyalties: ["character:b"],
          resources: ["savings"],
          conditions: ["hopeful"]
        },
        extensions: [
          {
            key: "debt_score",
            valueType: "number",
            value: 15
          }
        ],
        provenanceId: "prov:boundary-a"
      }
    ],
    events: [
      {
        eventId: "event:travel",
        storyId: "story:fixture",
        revisionId: "revision:fixture-1",
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
        preconditions: [
          {
            description: "A boards an airplane"
          }
        ],
        effects: [
          {
            effectId: "effect:travel",
            description: "A reaches New York",
            stateChanges: [
              {
                subjectId: "character:a",
                field: "locationId",
                operation: "set",
                value: "place:newyork",
                provenanceId: "prov:event-travel"
              }
            ],
            ruleChanges: []
          }
        ],
        causalLinkIds: []
      },
      {
        eventId: "event:betrayal",
        storyId: "story:fixture",
        revisionId: "revision:fixture-1",
        eventType: "betrayal",
        abstract: true,
        actorIds: ["character:a"],
        targetIds: ["character:b"],
        sequence: 2,
        time: {
          relation: "after",
          anchorEventId: "event:travel"
        },
        placeId: "place:newyork",
        preconditions: [
          {
            description: "A is threatened",
            actorId: "character:a"
          }
        ],
        effects: [
          {
            effectId: "effect:betrayal",
            description: "A's loyalty shifts under coercion",
            stateChanges: [
              {
                subjectId: "character:a",
                field: "loyalties",
                operation: "remove",
                value: "character:b",
                provenanceId: "prov:event-betrayal"
              },
              {
                subjectId: "character:a",
                field: "conditions",
                operation: "add",
                value: "coerced",
                provenanceId: "prov:event-betrayal"
              }
            ],
            ruleChanges: []
          }
        ],
        causalLinkIds: ["cause:betrayal"]
      }
    ],
    causalLinks: [
      {
        linkId: "cause:betrayal",
        storyId: "story:fixture",
        revisionId: "revision:fixture-1",
        causeEventId: "event:travel",
        effectEventId: "event:betrayal",
        relation: "enables"
      }
    ]
  };
}

describe("canonical persistence", () => {
  let pool: Pool;

  beforeEach(async () => {
    const created = createTestClient();
    pool = created.pool;
    await applyCanonicalSchema(pool);
  });

  it("persists story revisions, rules, verdicts, and provenance without field loss", async () => {
    const storyRepository = new StoryRepository(pool);
    const ruleRepository = new RuleRepository(pool);
    const verdictRunRepository = new VerdictRunRepository(pool);
    const verdictRepository = new VerdictRepository(pool);
    const provenanceRepository = new ProvenanceRepository(pool);

    await provenanceRepository.saveMany([
      {
        provenanceId: "prov:boundary-a",
        ownerType: "state_boundary",
        ownerId: "boundary:a-initial",
        sourceKind: "test_fixture",
        sourceRef: "tests/storage/persistence.test.ts",
        detail: { section: "initial state" }
      },
      {
        provenanceId: "prov:event-travel",
        ownerType: "event",
        ownerId: "event:travel",
        sourceKind: "test_fixture",
        sourceRef: "tests/storage/persistence.test.ts",
        detail: { effect: "travel" }
      },
      {
        provenanceId: "prov:event-betrayal",
        ownerType: "event",
        ownerId: "event:betrayal",
        sourceKind: "test_fixture",
        sourceRef: "tests/storage/persistence.test.ts",
        detail: { effect: "betrayal" }
      }
    ]);

    await storyRepository.saveGraph(buildStoryGraphFixture());

    await ruleRepository.saveRulePack(
      {
        rulePackId: "rulepack:reality-default",
        storyId: "story:fixture",
        revisionId: "revision:fixture-1",
        name: "Reality Default",
        description: "Baseline physical rules",
        worldAffiliation: "baseline",
        scope: "story",
        scopeTargetId: "story:fixture",
        priority: 0,
        active: true,
        sourceKind: "baseline",
        sourceText: "Reality physics apply unless overridden.",
        defaultPhysics: true
      },
      {
        ruleVersionId: "ruleversion:reality-default-v1",
        rulePackId: "rulepack:reality-default",
        executableKind: "predicate",
        executableRef: "rules/reality/default-v1",
        normalizedText: "Travel requires minimum time.",
        conditions: ["travel_attempt"],
        effects: ["requires_min_travel_time"],
        validationStatus: "validated"
      }
    );

    await verdictRunRepository.saveRun({
      runId: "run:fixture-1",
      storyId: "story:fixture",
      revisionId: "revision:fixture-1",
      triggerKind: "manual",
      createdAt: "2026-04-09T06:30:30Z"
    });

    await verdictRepository.saveVerdict({
      verdictId: "verdict:travel-ok",
      runId: "run:fixture-1",
      storyId: "story:fixture",
      revisionId: "revision:fixture-1",
      verdictKind: "Consistent",
      category: "physical_impossibility",
      explanation: "Travel duration satisfies the minimum constraint.",
      evidence: {
        findingId: "finding:travel-ok",
        eventIds: ["event:travel"],
        stateBoundaryIds: ["boundary:a-initial"],
        ruleVersionIds: ["ruleversion:reality-default-v1"],
        provenanceIds: ["prov:event-travel"],
        representativeChecker: "time",
        reasonCode: "travel_duration_ok",
        eventSummaries: [
          {
            eventId: "event:travel",
            eventType: "travel",
            sequence: 1,
            abstract: false,
            placeId: "place:newyork",
            actorIds: ["character:a"],
            targetIds: [],
            timeRelation: "after"
          }
        ],
        stateSummaries: [
          {
            characterId: "character:a",
            stateBoundaryId: "boundary:a-initial",
            previousBoundaryId: "boundary:a-initial",
            previousSourceEventId: "event:travel",
            relevantAxes: ["locationId", "goals"],
            values: {
              locationId: "place:seoul",
              goals: ["Buy a building"]
            }
          }
        ],
        ruleSummaries: [
          {
            rulePackId: "rulepack:reality-default",
            ruleVersionId: "ruleversion:reality-default-v1",
            name: "Reality Default",
            scope: "story",
            scopeTargetId: "story:fixture",
            worldAffiliation: "baseline",
            active: true,
            effects: ["requires_min_travel_time"]
          }
        ],
        conflictPath: ["event:travel"],
        missingPremises: [],
        supportingFindings: [
          {
            checker: "time",
            reasonCode: "travel_duration_ok",
            category: "temporal_contradiction",
            verdictKind: "Consistent",
            explanation: "Travel duration meets the minimum requirement.",
            evidence: {
              eventIds: ["event:travel"],
              stateBoundaryIds: ["boundary:a-initial"],
              ruleVersionIds: ["ruleversion:reality-default-v1"],
              provenanceIds: ["prov:event-travel"]
            }
          }
        ],
        notEvaluated: []
      },
      createdAt: "2026-04-09T06:31:00Z"
    });

    const reloadedGraph = await storyRepository.loadGraph("story:fixture", "revision:fixture-1");
    const reloadedRule = await ruleRepository.loadRuleVersion("ruleversion:reality-default-v1");
    const reloadedRuns = await verdictRunRepository.listRunsForRevision(
      "story:fixture",
      "revision:fixture-1"
    );
    const reloadedVerdicts = await verdictRepository.listForRun("run:fixture-1");
    const reloadedProvenance = await provenanceRepository.listByOwner("event", "event:betrayal");

    expect(reloadedGraph.story.title).toBe("Fixture Story");
    expect(reloadedGraph.events).toHaveLength(2);
    expect(reloadedGraph.events[1]?.abstract).toBe(true);
    expect(reloadedGraph.stateBoundaries[0]?.extensions[0]?.key).toBe("debt_score");
    expect(reloadedGraph.causalLinks[0]?.relation).toBe("enables");
    expect(reloadedRule.metadata.sourceText).toContain("Reality physics");
    expect(reloadedRule.metadata.scopeTargetId).toBe("story:fixture");
    expect(reloadedRule.version.normalizedText).toContain("minimum time");
    expect(reloadedRuns[0]?.runId).toBe("run:fixture-1");
    expect(reloadedVerdicts[0]?.runId).toBe("run:fixture-1");
    expect(reloadedVerdicts[0]?.evidence.findingId).toBe("finding:travel-ok");
    expect(reloadedVerdicts[0]?.evidence.ruleVersionIds).toContain("ruleversion:reality-default-v1");
    expect(reloadedVerdicts[0]?.evidence.reasonCode).toBe("travel_duration_ok");
    expect(reloadedVerdicts[0]?.evidence.eventSummaries[0]?.eventId).toBe("event:travel");
    expect(reloadedVerdicts[0]?.evidence.stateSummaries[0]?.previousSourceEventId).toBe(
      "event:travel"
    );
    expect(reloadedVerdicts[0]?.evidence.ruleSummaries[0]?.rulePackId).toBe(
      "rulepack:reality-default"
    );
    expect(reloadedVerdicts[0]?.evidence.conflictPath).toEqual(["event:travel"]);
    expect(reloadedVerdicts[0]?.evidence.supportingFindings[0]?.checker).toBe("time");
    expect(reloadedProvenance[0]?.sourceRef).toContain("persistence.test.ts");
  });

  it("keeps schema metadata aligned with the migration source of truth", () => {
    const sql = loadCanonicalMigrationSql();

    for (const tableName of canonicalTableNames) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${tableName}`);
    }
  });

  it("rejects invalid canonical rule payloads instead of silently coercing them", async () => {
    const ruleRepository = new RuleRepository(pool);

    await expect(
      ruleRepository.saveRulePack(
        {
          rulePackId: "rulepack:broken",
          storyId: "story:fixture",
          revisionId: "revision:fixture-1",
          name: "Broken",
          description: "Broken",
          worldAffiliation: "baseline",
          scope: "story",
          priority: 0,
          active: true,
          sourceKind: "baseline",
          sourceText: "Broken",
          defaultPhysics: false
        },
        {
          ruleVersionId: "ruleversion:broken",
          rulePackId: "rulepack:broken",
          executableKind: "predicate",
          executableRef: "rules/broken",
          normalizedText: ""
        } as never
      )
    ).rejects.toThrow();
  });
});
