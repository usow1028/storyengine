import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  loadPriorSnapshotSet,
  rankRepairCandidates,
  rerankRepairsWithPriors,
  scoreSoftDrift
} from "../../src/engine/index.js";
import { evaluateSoftPriors } from "../../src/services/index.js";
import {
  buildMotivationRepairs,
  buildSoftPriorArtifactsFixture,
  buildTeleportRepairs
} from "../fixtures/soft-prior-fixtures.js";

const tempDirs: string[] = [];

async function writeArtifacts() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "storygraph-priors-"));
  tempDirs.push(tempDir);
  const fixture = buildSoftPriorArtifactsFixture();

  for (const artifact of fixture.artifacts) {
    await writeFile(
      path.join(tempDir, artifact.filename),
      `${JSON.stringify(artifact.artifact, null, 2)}\n`,
      "utf8"
    );
  }

  return {
    tempDir,
    fixture
  };
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("repair plausibility", () => {
  it("reranks repairs by plausibility for a rule-exception-heavy transition", async () => {
    const { tempDir, fixture } = await writeArtifacts();
    const snapshotSet = await loadPriorSnapshotSet({
      snapshotDir: tempDir,
      genreWeights: fixture.teleportTransition.genreWeights
    });
    const assessment = scoreSoftDrift({
      snapshotSet,
      transition: fixture.teleportTransition
    });
    const repairs = buildTeleportRepairs();
    const reranked = rerankRepairsWithPriors({
      repairs,
      assessment
    });

    expect(reranked.rerankedRepairs[0]?.repairType).toBe("declare_rule");
    expect(reranked.adjustments[0]?.dominantPriorLayer).toBe("genre");
  });

  it("preserves the hard verdict kind while reranking motivation-sensitive repairs", async () => {
    const { tempDir, fixture } = await writeArtifacts();
    const baseRanked = rankRepairCandidates(buildMotivationRepairs());
    const result = await evaluateSoftPriors({
      snapshotDir: tempDir,
      transition: fixture.oathTransition,
      repairs: buildMotivationRepairs(),
      hardVerdictKind: "Repairable Gap"
    });

    expect(result.hardVerdictKind).toBe("Repairable Gap");
    expect(baseRanked[0]?.repairType).toBe("add_missing_assumption");
    expect(result.rerankedRepairs[0]?.repairType).toBe("add_prior_event");
    expect(result.assessment.dominantPriorLayer).toBeDefined();
  });
});
