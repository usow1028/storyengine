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
import type { VerdictRecord, VerdictRunRecord } from "../../src/domain/index.js";
import type { PriorSnapshotSet } from "../../src/engine/index.js";
import { buildImpossibleTravelFixture } from "../fixtures/hard-constraint-fixtures.js";
import { buildSoftPriorArtifactsFixture } from "../fixtures/soft-prior-fixtures.js";

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

function buildSnapshotSetFixture(): {
  snapshotSet: PriorSnapshotSet;
  genreWeights: { genreKey: string; weight: number }[];
} {
  const fixture = buildSoftPriorArtifactsFixture();

  return {
    snapshotSet: {
      snapshotDir: "fixture:soft-prior",
      baselineSnapshots:
        fixture.artifacts.find((artifact) => artifact.artifact.layer === "baseline")?.artifact
          .snapshots ?? [],
      genreSnapshots: fixture.artifacts
        .filter((artifact) => artifact.artifact.layer === "genre")
        .flatMap((artifact) => artifact.artifact.snapshots)
    },
    genreWeights: fixture.teleportTransition.genreWeights
  };
}

function hardVerdictProjection(verdicts: VerdictRecord[]) {
  return verdicts.map((verdict) => ({
    verdictKind: verdict.verdictKind,
    category: verdict.category,
    findingId: verdict.evidence.findingId,
    reasonCode: verdict.evidence.reasonCode,
    eventIds: verdict.evidence.eventIds,
    runId: verdict.runId,
    createdAt: verdict.createdAt
  }));
}

function runProjection(run: VerdictRunRecord | undefined) {
  return run
    ? {
        runId: run.runId,
        previousRunId: run.previousRunId,
        triggerKind: run.triggerKind,
        createdAt: run.createdAt
      }
    : undefined;
}

async function executeFixtureVerdictRun(options?: {
  softPriorConfig?: Parameters<typeof executeVerdictRun>[0]["softPriorConfig"];
}) {
  const created = createTestClient();
  await applyCanonicalSchema(created.pool);
  const {
    fixture,
    storyRepository,
    ruleRepository,
    verdictRepository,
    verdictRunRepository
  } = await persistFixture(created.pool);
  const result = await executeVerdictRun({
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
    createdAt: "2026-04-09T12:10:00Z",
    softPriorConfig: options?.softPriorConfig
  });
  const persistedVerdicts = await verdictRepository.listForRun(result.runId);
  const persistedRun = await verdictRunRepository.getRun(result.runId);

  return {
    result,
    persistedVerdicts,
    persistedRun
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
    expect(secondRun.softPrior.status).toBe("disabled");
    expect(runs).toHaveLength(2);
    expect(persistedVerdicts.every((verdict) => verdict.runId === secondRun.runId)).toBe(true);
  });

  it("returns an available soft-prior advisory when configured with a snapshot set", async () => {
    const { snapshotSet, genreWeights } = buildSnapshotSetFixture();
    const {
      fixture,
      storyRepository,
      ruleRepository,
      verdictRepository,
      verdictRunRepository
    } = await persistFixture(pool);

    const result = await executeVerdictRun({
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
      createdAt: "2026-04-09T12:10:00Z",
      softPriorConfig: {
        enabled: true,
        snapshotSet,
        genreWeights,
        worldProfile: "fantasy-light"
      }
    });

    expect(result.softPrior.status).toBe("available");
  });

  it("keeps persisted hard verdicts and run metadata invariant when soft priors are enabled", async () => {
    const { snapshotSet, genreWeights } = buildSnapshotSetFixture();
    const disabledRun = await executeFixtureVerdictRun();
    const enabledRun = await executeFixtureVerdictRun({
      softPriorConfig: {
        enabled: true,
        snapshotSet,
        genreWeights,
        worldProfile: "fantasy-light"
      }
    });

    expect(disabledRun.result.softPrior.status).toBe("disabled");
    expect(enabledRun.result.softPrior.status).toBe("available");
    expect(hardVerdictProjection(disabledRun.persistedVerdicts)).toEqual(
      hardVerdictProjection(enabledRun.persistedVerdicts)
    );
    expect(runProjection(disabledRun.persistedRun)).toEqual(runProjection(enabledRun.persistedRun));
    expect(
      hardVerdictProjection(enabledRun.persistedVerdicts).some(
        (verdict) => verdict.verdictKind === "Hard Contradiction"
      )
    ).toBe(true);
  });
});
