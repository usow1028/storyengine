import type { RepairCandidate, VerdictKind } from "../domain/index.js";
import {
  loadPriorSnapshotSet,
  rerankRepairsWithPriors,
  scoreSoftDrift,
  type PriorSnapshotSet,
  type SoftPriorTransitionInput
} from "../engine/index.js";

interface EvaluateSoftPriorsInput {
  snapshotDir: string;
  transition: SoftPriorTransitionInput;
  repairs: RepairCandidate[];
  hardVerdictKind?: VerdictKind;
  snapshotSet?: PriorSnapshotSet;
}

export async function evaluateSoftPriors(input: EvaluateSoftPriorsInput) {
  const snapshotSet =
    input.snapshotSet ??
    (await loadPriorSnapshotSet({
      snapshotDir: input.snapshotDir,
      genreWeights: input.transition.genreWeights
    }));
  const assessment = scoreSoftDrift({
    snapshotSet,
    transition: input.transition
  });
  const { rerankedRepairs, adjustments } = rerankRepairsWithPriors({
    repairs: input.repairs,
    assessment
  });

  return {
    snapshotSet,
    assessment,
    rerankedRepairs,
    adjustments,
    hardVerdictKind: input.hardVerdictKind
  };
}
