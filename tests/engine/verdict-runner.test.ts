import { beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import {
  applyCanonicalSchema,
  RuleRepository,
  StoryRepository,
  VerdictRepository,
  VerdictRunRepository
} from "../../src/storage/index.js";
import { executeVerdictRun } from "../../src/services/index.js";
import { buildImpossibleTravelFixture } from "../fixtures/hard-constraint-fixtures.js";

function createTestClient() {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  return { pool };
}

async function persistFixture(pool: Pool) {
  const fixture = buildImpossibleTravelFixture();
  const storyRepository = new StoryRepository(pool);
  const ruleRepository = new RuleRepository(pool);
  const verdictRepository = new VerdictRepository(pool);
  const verdictRunRepository = new VerdictRunRepository(pool);

  await storyRepository.saveGraph(fixture.graph);
  for (const rule of fixture.availableRules) {
    if (rule.version) {
      await ruleRepository.saveRulePack(rule.metadata, rule.version);
    }
  }

  return {
    fixture,
    storyRepository,
    ruleRepository,
    verdictRepository,
    verdictRunRepository
  };
}

describe("verdict runner", () => {
  let pool: Pool;

  beforeEach(async () => {
    const created = createTestClient();
    pool = created.pool;
    await applyCanonicalSchema(pool);
  });

  it("creates a distinct verdict run for each execution on the same revision", async () => {
    const {
      fixture,
      storyRepository,
      ruleRepository,
      verdictRepository,
      verdictRunRepository
    } = await persistFixture(pool);

    const firstRun = await executeVerdictRun({
      storyId: fixture.graph.story.storyId,
      revisionId: fixture.graph.revision.revisionId,
      storyRepository,
      ruleRepository,
      verdictRepository,
      verdictRunRepository,
      triggerKind: "test",
      boundaryFactsByEventId: {
        [fixture.eventId]: fixture.boundaryFactsByCharacterId
      },
      createdAt: "2026-04-09T12:00:00Z"
    });
    const secondRun = await executeVerdictRun({
      storyId: fixture.graph.story.storyId,
      revisionId: fixture.graph.revision.revisionId,
      storyRepository,
      ruleRepository,
      verdictRepository,
      verdictRunRepository,
      triggerKind: "test",
      boundaryFactsByEventId: {
        [fixture.eventId]: fixture.boundaryFactsByCharacterId
      },
      createdAt: "2026-04-09T12:05:00Z"
    });

    const runs = await verdictRunRepository.listRunsForRevision(
      fixture.graph.story.storyId,
      fixture.graph.revision.revisionId
    );
    const persistedVerdicts = await verdictRepository.listForRun(secondRun.runId);

    expect(firstRun.runId).not.toBe(secondRun.runId);
    expect(secondRun.previousRunId).toBe(firstRun.runId);
    expect(runs).toHaveLength(2);
    expect(persistedVerdicts.every((verdict) => verdict.runId === secondRun.runId)).toBe(true);
  });
});
