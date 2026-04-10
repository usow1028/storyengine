import { newDb } from "pg-mem";
import type { Pool } from "pg";

import { buildStoryGraphApi } from "../../src/api/app.js";
import { createConfiguredIngestionLlmClient, executeVerdictRun } from "../../src/services/index.js";
import type { PriorSnapshotSet } from "../../src/engine/index.js";
import {
  applyCanonicalSchema,
  IngestionSessionRepository,
  ProvenanceRepository,
  RuleRepository,
  StoryRepository,
  VerdictRepository,
  VerdictRunRepository
} from "../../src/storage/index.js";
import { buildImpossibleTravelFixture } from "../fixtures/hard-constraint-fixtures.js";
import { buildSoftPriorArtifactsFixture } from "../fixtures/soft-prior-fixtures.js";

const HOST = "127.0.0.1";
const PORT = 4178;
const CREATED_AT = "2026-04-10T12:30:00Z";

function createTestClient(): { pool: Pool } {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  return { pool };
}

function buildSnapshotSetFixture(): {
  snapshotSet: PriorSnapshotSet;
  genreWeights: { genreKey: string; weight: number }[];
} {
  const fixture = buildSoftPriorArtifactsFixture();

  return {
    snapshotSet: {
      snapshotDir: "fixture:inspection-browser",
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

async function seedInspectionRun(pool: Pool): Promise<string> {
  const fixture = buildImpossibleTravelFixture();
  const storyRepository = new StoryRepository(pool);
  const ruleRepository = new RuleRepository(pool);
  const verdictRepository = new VerdictRepository(pool);
  const verdictRunRepository = new VerdictRunRepository(pool);
  const { snapshotSet, genreWeights } = buildSnapshotSetFixture();

  await storyRepository.saveGraph(fixture.graph);
  for (const rule of fixture.availableRules) {
    if (rule.version) {
      await ruleRepository.saveRulePack(rule.metadata, rule.version);
    }
  }

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
    createdAt: CREATED_AT,
    softPriorConfig: {
      enabled: true,
      snapshotSet,
      genreWeights,
      worldProfile: "fantasy-light"
    }
  });

  return result.runId;
}

async function startServer() {
  const { pool } = createTestClient();
  await applyCanonicalSchema(pool);
  const runId = await seedInspectionRun(pool);
  const app = buildStoryGraphApi({
    ingestionSessionRepository: new IngestionSessionRepository(pool),
    storyRepository: new StoryRepository(pool),
    ruleRepository: new RuleRepository(pool),
    provenanceRepository: new ProvenanceRepository(pool),
    verdictRepository: new VerdictRepository(pool),
    verdictRunRepository: new VerdictRunRepository(pool),
    llmClient: createConfiguredIngestionLlmClient({
      modelName: "inspection-browser-test",
      extractor: async () => ({ candidates: [] })
    }),
    inspectionUiDistDir: "dist/ui"
  });

  await app.listen({ host: HOST, port: PORT });
  console.log(
    `[inspection-test-server] listening=http://${HOST}:${PORT} runId=${runId} route=/inspection/runs/${encodeURIComponent(runId)}`
  );

  const shutdown = async () => {
    await app.close();
    await pool.end();
  };

  process.once("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });
  process.once("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });
}

startServer().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
