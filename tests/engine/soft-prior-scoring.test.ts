import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadPriorSnapshotSet, scoreSoftDrift } from "../../src/engine/index.js";
import {
  buildSoftPriorArtifactsFixture,
  createSparseSnapshotSet
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

describe("soft prior scoring", () => {
  it("records drift type scores separately and reports the dominant prior layer", async () => {
    const { tempDir, fixture } = await writeArtifacts();
    const snapshotSet = await loadPriorSnapshotSet({
      snapshotDir: tempDir,
      genreWeights: fixture.teleportTransition.genreWeights
    });
    const assessment = scoreSoftDrift({
      snapshotSet,
      transition: fixture.teleportTransition
    });

    expect(Object.keys(assessment.driftScores)).toEqual([
      "transition_drift",
      "motivation_drift",
      "rule_exception_rarity"
    ]);
    expect(assessment.dominantPriorLayer).toBe("genre");
    expect(assessment.representativePatternSummary).toContain("spell_cast -> instant_arrival");
  });

  it("weakens sparse genre layers and raises the dynamic threshold", async () => {
    const { tempDir, fixture } = await writeArtifacts();
    const strongSnapshotSet = await loadPriorSnapshotSet({
      snapshotDir: tempDir,
      genreWeights: fixture.oathTransition.genreWeights
    });
    const sparseSnapshotSet = createSparseSnapshotSet(strongSnapshotSet);
    const strongAssessment = scoreSoftDrift({
      snapshotSet: strongSnapshotSet,
      transition: fixture.oathTransition
    });
    const sparseAssessment = scoreSoftDrift({
      snapshotSet: sparseSnapshotSet,
      transition: fixture.oathTransition
    });

    const strongGenreContribution = strongAssessment.contributions.find(
      (contribution) =>
        contribution.layer === "genre" && contribution.driftType === "transition_drift"
    );
    const sparseGenreContribution = sparseAssessment.contributions.find(
      (contribution) =>
        contribution.layer === "genre" && contribution.driftType === "transition_drift"
    );

    expect(strongGenreContribution?.confidence).toBeGreaterThan(
      sparseGenreContribution?.confidence ?? 0
    );
    expect(sparseAssessment.thresholds.transition_drift).toBeGreaterThan(
      strongAssessment.thresholds.transition_drift
    );
    // dynamic threshold behavior should keep sparse evidence from behaving like strong evidence.
    expect(sparseAssessment.driftScores.transition_drift).toBeLessThanOrEqual(
      strongAssessment.driftScores.transition_drift
    );
  });
});
