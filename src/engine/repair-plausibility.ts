import {
  RepairPlausibilityAdjustmentSchema,
  type RepairCandidate,
  type RepairPlausibilityAdjustment,
  type SoftPriorAssessment
} from "../domain/index.js";
import { rankRepairCandidates } from "./repair-ranking.js";

interface RerankRepairsWithPriorsInput {
  repairs: RepairCandidate[];
  assessment: SoftPriorAssessment;
}

interface CandidateWithIndex {
  candidate: RepairCandidate;
  baseIndex: number;
  adjustment: RepairPlausibilityAdjustment;
}

function candidateAdjustmentScore(
  candidate: RepairCandidate,
  assessment: SoftPriorAssessment
): number {
  switch (candidate.repairType) {
    case "add_prior_event":
      return assessment.driftScores.transition_drift * 0.75 +
        assessment.driftScores.motivation_drift * 0.15;
    case "add_missing_assumption":
      return assessment.driftScores.motivation_drift * 0.8 +
        assessment.driftScores.transition_drift * 0.1;
    case "declare_rule":
      return clamp(1 - assessment.driftScores.rule_exception_rarity);
    case "repair_bundle":
      return (
        assessment.driftScores.transition_drift +
        assessment.driftScores.motivation_drift +
        clamp(1 - assessment.driftScores.rule_exception_rarity)
      ) / 3;
  }
}

function clamp(value: number, minimum = -1, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function averageConfidence(assessment: SoftPriorAssessment): number {
  if (assessment.contributions.length === 0) {
    return 0;
  }

  const total = assessment.contributions.reduce(
    (sum, contribution) => sum + contribution.confidence,
    0
  );

  return clamp(total / assessment.contributions.length, 0, 1);
}

function buildAdjustment(
  candidate: RepairCandidate,
  assessment: SoftPriorAssessment
): RepairPlausibilityAdjustment {
  return RepairPlausibilityAdjustmentSchema.parse({
    repairId: candidate.repairId,
    adjustment: candidateAdjustmentScore(candidate, assessment),
    confidence: averageConfidence(assessment),
    dominantPriorLayer: assessment.dominantPriorLayer,
    representativePatternSummary: assessment.representativePatternSummary
  });
}

export function rerankRepairsWithPriors(input: RerankRepairsWithPriorsInput): {
  rerankedRepairs: RepairCandidate[];
  adjustments: RepairPlausibilityAdjustment[];
} {
  const baseRanked = rankRepairCandidates(input.repairs);
  const withAdjustments: CandidateWithIndex[] = baseRanked.map((candidate, index) => ({
    candidate,
    baseIndex: index,
    adjustment: buildAdjustment(candidate, input.assessment)
  }));

  withAdjustments.sort((left, right) => {
    return (
      right.adjustment.adjustment - left.adjustment.adjustment ||
      left.baseIndex - right.baseIndex ||
      left.candidate.summary.localeCompare(right.candidate.summary)
    );
  });

  return {
    rerankedRepairs: withAdjustments.map(({ candidate }) => candidate),
    adjustments: withAdjustments.map(({ adjustment }) => adjustment)
  };
}
