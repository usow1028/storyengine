import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  createGenreKey,
  createPriorArtifactFilename,
  GenreWeightSchema,
  PriorSnapshotArtifactSchema
} from "../domain/index.js";
import type { GenreWeight } from "../domain/index.js";
import type { PriorSnapshotSet } from "./types.js";

const BASELINE_FILENAME = "baseline.prior.json";

interface LoadPriorSnapshotSetInput {
  snapshotDir: string;
  genreWeights: GenreWeight[];
}

async function readArtifact(filePath: string) {
  const raw = await readFile(filePath, "utf8");
  return PriorSnapshotArtifactSchema.parse(JSON.parse(raw));
}

export async function loadPriorSnapshotSet(
  input: LoadPriorSnapshotSetInput
): Promise<PriorSnapshotSet> {
  const genreWeights = GenreWeightSchema.array().parse(input.genreWeights);
  const genreKey = createGenreKey(genreWeights);
  const baselinePath = path.join(input.snapshotDir, BASELINE_FILENAME);
  const genrePath = path.join(
    input.snapshotDir,
    createPriorArtifactFilename("genre", genreKey)
  );

  const baselineArtifact = await readArtifact(baselinePath);
  let genreSnapshots = baselineArtifact.snapshots.slice(0, 0);

  try {
    const genreArtifact = await readArtifact(genrePath);
    genreSnapshots = genreArtifact.snapshots;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  return {
    snapshotDir: input.snapshotDir,
    baselineSnapshots: baselineArtifact.snapshots,
    genreSnapshots
  };
}
