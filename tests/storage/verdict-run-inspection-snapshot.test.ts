import { beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import {
  applyCanonicalSchema,
  VerdictRunRepository
} from "../../src/storage/index.js";
import { RunInspectionSnapshotSchema, type RunInspectionSnapshot } from "../../src/domain/index.js";

function createTestClient() {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  return { memory, pool };
}

const repairCandidate = {
  repairId: "repair:missing-bridge",
  repairType: "add_missing_assumption",
  reasonCode: "missing_bridge",
  sourceFindingIds: ["finding:gap"],
  confidenceBand: "medium",
  summary: "Add a prior explanation for how the locked room opened.",
  payload: {
    assumptionText: "The room was opened by a guard before the scene.",
    relatedEventId: "event:locked-room"
  }
} as const;

const snapshot: RunInspectionSnapshot = {
  runId: "run:inspection-1",
  createdAt: "2026-04-10T09:00:00Z",
  repairCandidates: [repairCandidate],
  advisory: {
    status: "available",
    assessment: {
      driftScores: {
        transition_drift: 0.7,
        motivation_drift: 0.2,
        rule_exception_rarity: 0.1
      },
      thresholds: {
        transition_drift: 0.5,
        motivation_drift: 0.5,
        rule_exception_rarity: 0.5
      },
      dominantPriorLayer: "baseline",
      triggeredDrifts: ["transition_drift"],
      representativePatternSummary: "Locked-room escapes usually need an explicit access cause.",
      contributions: [
        {
          layer: "baseline",
          genreKey: "baseline",
          worldProfile: "reality-default",
          driftType: "transition_drift",
          sampleCount: 12,
          confidence: 0.8,
          appliedWeight: 1,
          score: 0.7,
          threshold: 0.5,
          patternKey: "locked-room::access-cause",
          representativePatternSummary: "Locked-room escapes usually need an explicit access cause."
        }
      ]
    },
    rerankedRepairs: [repairCandidate],
    repairPlausibilityAdjustments: [
      {
        repairId: "repair:missing-bridge",
        adjustment: 0.2,
        confidence: 0.8,
        dominantPriorLayer: "baseline",
        representativePatternSummary: "Locked-room escapes usually need an explicit access cause."
      }
    ]
  }
};

async function seedRun(pool: Pool) {
  await pool.query(
    `
      INSERT INTO stories (story_id, title, description, default_rule_pack_name)
      VALUES ($1, $2, $3, $4)
    `,
    ["story:inspection", "Inspection Fixture", "Storage fixture", "reality-default"]
  );
  await pool.query(
    `
      INSERT INTO story_revisions (revision_id, story_id, source_kind, created_at)
      VALUES ($1, $2, $3, $4)
    `,
    ["revision:inspection", "story:inspection", "manual", "2026-04-10T08:59:00Z"]
  );

  const repository = new VerdictRunRepository(pool);
  await repository.saveRun({
    runId: snapshot.runId,
    storyId: "story:inspection",
    revisionId: "revision:inspection",
    triggerKind: "manual",
    createdAt: snapshot.createdAt
  });

  return repository;
}

describe("verdict run inspection snapshots", () => {
  let pool: Pool;

  beforeEach(async () => {
    const created = createTestClient();
    pool = created.pool;
    await applyCanonicalSchema(pool);
  });

  it("adds inspection_snapshot to verdict_runs through the canonical schema", async () => {
    await expect(pool.query("SELECT inspection_snapshot FROM verdict_runs")).resolves.toBeDefined();
  });

  it("saves and reloads a sanitized inspection snapshot for an existing run", async () => {
    const repository = await seedRun(pool);

    await repository.saveInspectionSnapshot(snapshot.runId, snapshot);

    const loaded = await repository.getInspectionSnapshot(snapshot.runId);
    expect(loaded).toEqual(RunInspectionSnapshotSchema.parse(snapshot));
  });

  it("returns undefined when a verdict run has no inspection snapshot", async () => {
    const repository = await seedRun(pool);

    await expect(repository.getInspectionSnapshot(snapshot.runId)).resolves.toBeUndefined();
  });

  it("does not serialize raw prior artifacts or runtime prior config into snapshots", async () => {
    const repository = await seedRun(pool);

    await repository.saveInspectionSnapshot(snapshot.runId, snapshot);

    const loaded = await repository.getInspectionSnapshot(snapshot.runId);
    const serialized = JSON.stringify(loaded);
    expect(serialized).not.toContain("sourceWorkIds");
    expect(serialized).not.toContain("snapshotDir");
    expect(serialized).not.toContain("snapshotSet");
    expect(serialized).not.toContain("PriorSnapshot");
    expect(serialized).not.toContain("rawCorpusRows");
  });
});
