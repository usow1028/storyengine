import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import { executeIngestionCheck } from "../../src/services/ingestion-check.js";
import {
  applyCanonicalSchema,
  IngestionSessionRepository,
  RuleRepository,
  StoryRepository,
  VerdictRepository,
  VerdictRunRepository
} from "../../src/storage/index.js";
import { buildImpossibleTravelFixture } from "../fixtures/hard-constraint-fixtures.js";

function createTestClient() {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  return { pool };
}

describe("ingestion check soft-prior advisory handling", () => {
  let pool: Pool;
  let ingestionSessionRepository: IngestionSessionRepository;
  let storyRepository: StoryRepository;
  let ruleRepository: RuleRepository;
  let verdictRepository: VerdictRepository;
  let verdictRunRepository: VerdictRunRepository;
  let tempDirs: string[];

  beforeEach(async () => {
    const created = createTestClient();
    pool = created.pool;
    await applyCanonicalSchema(pool);
    ingestionSessionRepository = new IngestionSessionRepository(pool);
    storyRepository = new StoryRepository(pool);
    ruleRepository = new RuleRepository(pool);
    verdictRepository = new VerdictRepository(pool);
    verdictRunRepository = new VerdictRunRepository(pool);
    tempDirs = [];
  });

  afterEach(async () => {
    await pool.end();
    await Promise.all(tempDirs.map((tempDir) => rm(tempDir, { recursive: true, force: true })));
  });

  async function createApprovedFixtureSession(sessionId: string): Promise<void> {
    const fixture = buildImpossibleTravelFixture();
    await storyRepository.saveGraph(fixture.graph);

    for (const rule of fixture.availableRules) {
      if (rule.version) {
        await ruleRepository.saveRulePack(rule.metadata, rule.version);
      }
    }

    await ingestionSessionRepository.createSession({
      sessionId,
      storyId: fixture.graph.story.storyId,
      revisionId: fixture.graph.revision.revisionId,
      draftTitle: "Soft Prior Check Draft",
      defaultRulePackName: fixture.graph.story.defaultRulePackName,
      inputKind: "full_draft",
      rawText: "A reaches the airport. A appears in New York immediately.",
      workflowState: "approved",
      promptFamily: "phase7-test",
      modelName: "test-model",
      lastVerdictRunId: null,
      createdAt: "2026-04-10T03:00:00Z",
      updatedAt: "2026-04-10T03:00:00Z",
      lastCheckedAt: null
    });

    await ingestionSessionRepository.saveSegments(sessionId, [
      {
        segmentId: `${sessionId}:segment:1`,
        sessionId,
        sequence: 0,
        label: "Airport",
        startOffset: 0,
        endOffset: 22,
        segmentText: "A reaches the airport.",
        workflowState: "approved",
        approvedAt: "2026-04-10T03:01:00Z"
      },
      {
        segmentId: `${sessionId}:segment:2`,
        sessionId,
        sequence: 1,
        label: "Arrival",
        startOffset: 23,
        endOffset: 57,
        segmentText: "A appears in New York immediately.",
        workflowState: "approved",
        approvedAt: "2026-04-10T03:01:00Z"
      }
    ]);
  }

  async function expectOnePersistedRun(input: {
    sessionId: string;
    storyId: string;
    revisionId: string;
    runId: string;
  }): Promise<void> {
    const runs = await verdictRunRepository.listRunsForRevision(input.storyId, input.revisionId);
    const snapshot = await ingestionSessionRepository.loadSessionSnapshot(input.sessionId);

    expect(runs).toHaveLength(1);
    expect(runs[0]?.runId).toBe(input.runId);
    expect(snapshot.session.lastVerdictRunId).toBe(input.runId);
  }

  it("returns checked with disabled soft priors when no soft-prior config is provided", async () => {
    const sessionId = "session:soft-prior-disabled";
    await createApprovedFixtureSession(sessionId);

    const result = await executeIngestionCheck(sessionId, {
      ingestionSessionRepository,
      storyRepository,
      ruleRepository,
      verdictRepository,
      verdictRunRepository,
      now: () => "2026-04-10T03:10:00Z"
    });

    expect(result.workflowState).toBe("checked");
    expect(result.softPrior.status).toBe("disabled");
    expect(result.runId.startsWith("run:")).toBe(true);
    expect(result.previousRunId).toBeNull();
    await expectOnePersistedRun(result);
  });

  it("returns checked with missing_snapshot soft priors when configured snapshot dir is empty", async () => {
    const sessionId = "session:soft-prior-missing";
    const snapshotDir = await mkdtemp(path.join(os.tmpdir(), "storygraph-empty-priors-"));
    tempDirs.push(snapshotDir);
    await createApprovedFixtureSession(sessionId);

    const result = await executeIngestionCheck(sessionId, {
      ingestionSessionRepository,
      storyRepository,
      ruleRepository,
      verdictRepository,
      verdictRunRepository,
      softPriorConfig: {
        enabled: true,
        snapshotDir,
        genreWeights: [{ genreKey: "fantasy", weight: 1 }],
        worldProfile: "fantasy-light"
      },
      now: () => "2026-04-10T03:20:00Z"
    });

    expect(result.workflowState).toBe("checked");
    expect(result.softPrior.status).toBe("missing_snapshot");
    expect(result.runId.startsWith("run:")).toBe(true);
    expect(result.previousRunId).toBeNull();
    await expectOnePersistedRun(result);
  });
});
