import {
  type AddMissingAssumptionPayload,
  type AddPriorEventPayload,
  type DeclareRulePayload,
  RepairCandidateSchema,
  type RepairCandidate,
  type RepairConfidenceBand
} from "../domain/index.js";

interface RepairRankMetrics {
  minimalChangeCost: number;
  storyWorldFit: number;
  locality: number;
}

function minimalChangeCost(candidate: RepairCandidate): number {
  switch (candidate.repairType) {
    case "add_missing_assumption":
      return 1;
    case "add_prior_event":
      return 2;
    case "declare_rule":
      return 3;
    case "repair_bundle":
      return 4;
  }
}

function storyWorldFit(candidate: RepairCandidate): number {
  if (candidate.repairType === "add_missing_assumption") {
    return candidate.reasonCode === "loyalty_reversal_without_cause" ? 3 : 2;
  }

  if (candidate.repairType === "add_prior_event") {
    return candidate.reasonCode === "impossible_travel" ? 2 : 3;
  }

  if (candidate.repairType === "declare_rule") {
    return candidate.reasonCode === "impossible_travel" ? 1 : 2;
  }

  return 0;
}

function locality(candidate: RepairCandidate): number {
  switch (candidate.repairType) {
    case "add_missing_assumption": {
      const payload = candidate.payload as AddMissingAssumptionPayload;
      return payload.relatedEventId ? 3 : 2;
    }
    case "add_prior_event": {
      const payload = candidate.payload as AddPriorEventPayload;
      return payload.anchorEventId ? 3 : 2;
    }
    case "declare_rule": {
      const payload = candidate.payload as DeclareRulePayload;
      return payload.scope === "event" ? 3 : payload.scope === "story" ? 1 : 2;
    }
    case "repair_bundle":
      return 1;
  }
}

function compareCandidates(left: RepairCandidate, right: RepairCandidate): number {
  const leftMetrics = {
    minimalChangeCost: minimalChangeCost(left),
    storyWorldFit: storyWorldFit(left),
    locality: locality(left)
  };
  const rightMetrics = {
    minimalChangeCost: minimalChangeCost(right),
    storyWorldFit: storyWorldFit(right),
    locality: locality(right)
  };

  return (
    leftMetrics.minimalChangeCost - rightMetrics.minimalChangeCost ||
    rightMetrics.storyWorldFit - leftMetrics.storyWorldFit ||
    rightMetrics.locality - leftMetrics.locality ||
    left.summary.localeCompare(right.summary)
  );
}

export function rankRepairCandidates(candidates: RepairCandidate[]): RepairCandidate[] {
  return [...candidates]
    .map((candidate) => RepairCandidateSchema.parse(candidate))
    .sort((left, right) => compareCandidates(left, right));
}

export function assignRepairConfidenceBand(candidate: RepairCandidate): RepairConfidenceBand {
  const metrics: RepairRankMetrics = {
    minimalChangeCost: minimalChangeCost(candidate),
    storyWorldFit: storyWorldFit(candidate),
    locality: locality(candidate)
  };

  if (
    metrics.minimalChangeCost <= 1 &&
    metrics.storyWorldFit >= 2 &&
    metrics.locality >= 2
  ) {
    return "high";
  }

  if (
    metrics.minimalChangeCost <= 3 &&
    metrics.storyWorldFit >= 1 &&
    metrics.locality >= 1
  ) {
    return "medium";
  }

  return "low";
}
