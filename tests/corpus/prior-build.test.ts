import { describe, expect, it } from "vitest";

import {
  buildPriorSnapshots,
  exportPriorSnapshots,
  normalizeCorpusWork
} from "../../src/corpus/index.js";
import { createGenreKey } from "../../src/domain/index.js";
import { buildCorpusPriorFixtures } from "../fixtures/corpus-prior-fixtures.js";

describe("prior build", () => {
  const normalizedWorks = buildCorpusPriorFixtures().map((work) => normalizeCorpusWork(work));
  const snapshotVersion = "prior:2026-04-09";
  const builtAt = "2026-04-09T12:00:00Z";

  it("builds separate baseline and genre snapshots with preserved snapshot ids and sampleCount", () => {
    const snapshots = buildPriorSnapshots({
      normalizedWorks,
      snapshotVersion,
      builtAt
    });

    const baselineSnapshots = snapshots.filter((snapshot) => snapshot.layer === "baseline");
    const genreSnapshots = snapshots.filter((snapshot) => snapshot.layer === "genre");
    const fantasyGenreKey = createGenreKey(normalizedWorks[1]!.genreWeights);

    expect(baselineSnapshots).toHaveLength(2);
    expect(genreSnapshots.length).toBeGreaterThanOrEqual(2);
    expect(snapshots.every((snapshot) => snapshot.snapshotId.startsWith(snapshotVersion))).toBe(
      true
    );
    expect(baselineSnapshots.every((snapshot) => snapshot.sampleCount > 0)).toBe(true);
    expect(genreSnapshots.some((snapshot) => snapshot.genreKey === fantasyGenreKey)).toBe(true);
    expect(
      genreSnapshots.some((snapshot) =>
        snapshot.driftPatterns.some((pattern) => pattern.driftType === "rule_exception_rarity")
      )
    ).toBe(true);
  });

  it("exports baseline.prior.json and genre-<key>.prior.json artifacts", () => {
    const artifacts = exportPriorSnapshots({
      snapshots: buildPriorSnapshots({
        normalizedWorks,
        snapshotVersion,
        builtAt
      }),
      snapshotVersion,
      exportedAt: builtAt
    });

    const realityGenreKey = createGenreKey(normalizedWorks[0]!.genreWeights);
    const fantasyGenreKey = createGenreKey(normalizedWorks[1]!.genreWeights);
    const filenames = artifacts.map((artifact) => artifact.filename);
    const baselineArtifact = artifacts.find((artifact) => artifact.filename === "baseline.prior.json");

    expect(filenames).toContain("baseline.prior.json");
    expect(filenames).toContain(`genre-${realityGenreKey}.prior.json`);
    expect(filenames).toContain(`genre-${fantasyGenreKey}.prior.json`);
    expect(baselineArtifact?.artifact.snapshots.every((snapshot) => snapshot.layer === "baseline")).toBe(
      true
    );
    expect(
      artifacts
        .flatMap((artifact) => artifact.artifact.snapshots)
        .every((snapshot) => snapshot.sampleCount > 0)
    ).toBe(true);
  });
});
