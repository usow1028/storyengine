import {
  SoftDriftScoreMapSchema,
  SoftPriorAssessmentSchema,
  type PriorContribution,
  type PriorSnapshot,
  type SoftDriftType,
  type SoftPriorAssessment
} from "../domain/index.js";
import type { PriorSnapshotSet, SoftPriorTransitionInput } from "./types.js";

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function overlapScore(expected: string[], actual: string[]): number {
  if (expected.length === 0 && actual.length === 0) {
    return 1;
  }

  if (expected.length === 0 || actual.length === 0) {
    return 0;
  }

  const actualSet = new Set(actual);
  const matches = expected.filter((item) => actualSet.has(item)).length;

  return matches / Math.max(expected.length, actual.length);
}

function transitionMatchScore(
  snapshot: PriorSnapshot,
  transition: SoftPriorTransitionInput
) {
  return snapshot.positivePatterns
    .filter(
      (pattern) =>
        pattern.currentEventType === transition.currentEventType &&
        pattern.nextEventType === transition.nextEventType
    )
    .map((pattern) => ({
      pattern,
      score:
        overlapScore(pattern.stateTransitionTokens, transition.stateTransitionTokens) * 0.4 +
        overlapScore(pattern.worldRuleExceptionTokens, transition.worldRuleExceptionTokens) * 0.35 +
        overlapScore(pattern.preconditionTokens, transition.preconditionTokens) * 0.25
    }))
    .sort((left, right) => right.score - left.score)[0];
}

function driftTriggerTokens(
  driftType: SoftDriftType,
  transition: SoftPriorTransitionInput
): string[] {
  switch (driftType) {
    case "transition_drift":
      return transition.preconditionTokens;
    case "motivation_drift":
      return transition.stateAxes.filter((axis) =>
        ["knowledge", "goals", "loyalties", "conditions"].includes(axis)
      );
    case "rule_exception_rarity":
      return transition.worldRuleExceptionTokens;
  }
}

function driftMatchScore(
  snapshot: PriorSnapshot,
  transition: SoftPriorTransitionInput,
  driftType: SoftDriftType
) {
  const tokens = driftTriggerTokens(driftType, transition);

  return snapshot.driftPatterns
    .filter(
      (pattern) =>
        pattern.driftType === driftType &&
        pattern.currentEventType === transition.currentEventType &&
        pattern.nextEventType === transition.nextEventType
    )
    .map((pattern) => ({
      pattern,
      score:
        overlapScore(pattern.triggerTokens, tokens) * 0.7 +
        overlapScore(pattern.stateAxes, transition.stateAxes) * 0.3
    }))
    .sort((left, right) => right.score - left.score)[0];
}

function confidenceForSampleCount(sampleCount: number): number {
  return clamp(sampleCount / 6, 0.2, 1);
}

function dynamicThreshold(confidence: number): number {
  return clamp(0.45 + (1 - confidence) * 0.25, 0.45, 0.7);
}

function relevantSnapshots(
  snapshotSet: PriorSnapshotSet,
  transition: SoftPriorTransitionInput
): PriorSnapshot[] {
  return [
    ...snapshotSet.baselineSnapshots.filter(
      (snapshot) => snapshot.worldProfile === transition.worldProfile
    ),
    ...snapshotSet.genreSnapshots.filter(
      (snapshot) => snapshot.worldProfile === transition.worldProfile
    )
  ];
}

function scoreContribution(
  snapshot: PriorSnapshot,
  transition: SoftPriorTransitionInput,
  driftType: SoftDriftType
): PriorContribution {
  const confidence = confidenceForSampleCount(snapshot.sampleCount);
  const threshold = dynamicThreshold(confidence);
  const positiveMatch = transitionMatchScore(snapshot, transition);
  const driftMatch = driftMatchScore(snapshot, transition, driftType);
  const positiveStrength = clamp(
    (positiveMatch?.score ?? 0) * ((positiveMatch?.pattern.sampleCount ?? 0) / Math.max(1, snapshot.sampleCount))
  );
  const driftStrength = clamp(
    (driftMatch?.score ?? 0) * ((driftMatch?.pattern.sampleCount ?? 0) / Math.max(1, snapshot.sampleCount))
  );
  const rarityPenalty =
    driftType === "rule_exception_rarity" && transition.worldRuleExceptionTokens.length === 0
      ? 0
      : 1 - positiveStrength;
  const baseScore =
    driftType === "rule_exception_rarity"
      ? rarityPenalty * 0.7 + driftStrength * 0.3
      : driftStrength * 0.6 + rarityPenalty * 0.4;
  const score = clamp(baseScore * confidence);

  return {
    layer: snapshot.layer,
    genreKey: snapshot.genreKey,
    worldProfile: snapshot.worldProfile,
    driftType,
    sampleCount: snapshot.sampleCount,
    confidence,
    appliedWeight: confidence,
    score,
    threshold,
    patternKey: driftMatch?.pattern.patternKey ?? positiveMatch?.pattern.patternKey,
    representativePatternSummary:
      driftMatch?.pattern.representativePatternSummary ??
      positiveMatch?.pattern.representativePatternSummary ??
      `No representative ${driftType} pattern matched for ${transition.currentEventType} -> ${transition.nextEventType}.`
  };
}

function emptyDriftScores() {
  return {
    transition_drift: 0,
    motivation_drift: 0,
    rule_exception_rarity: 0
  };
}

const DRIFT_TYPES: SoftDriftType[] = [
  "transition_drift",
  "motivation_drift",
  "rule_exception_rarity"
];

export function scoreSoftDrift(input: {
  snapshotSet: PriorSnapshotSet;
  transition: SoftPriorTransitionInput;
}): SoftPriorAssessment {
  const contributions = relevantSnapshots(input.snapshotSet, input.transition).flatMap((snapshot) =>
    DRIFT_TYPES.map((driftType) => scoreContribution(snapshot, input.transition, driftType))
  );
  const strongestByDrift = new Map<SoftDriftType, PriorContribution>();

  for (const contribution of contributions) {
    const existing = strongestByDrift.get(contribution.driftType);
    if (!existing || contribution.score > existing.score) {
      strongestByDrift.set(contribution.driftType, contribution);
    }
  }

  const driftScores = emptyDriftScores();
  const thresholds = emptyDriftScores();

  for (const driftType of DRIFT_TYPES) {
    const strongest = strongestByDrift.get(driftType);
    driftScores[driftType] = strongest?.score ?? 0;
    thresholds[driftType] = strongest?.threshold ?? dynamicThreshold(0.2);
  }

  const layerTotals = contributions.reduce<Record<string, number>>((accumulator, contribution) => {
    accumulator[contribution.layer] = (accumulator[contribution.layer] ?? 0) + contribution.score;
    return accumulator;
  }, {});
  const dominantPriorLayer = (Object.entries(layerTotals).sort((left, right) => right[1] - left[1])[0]?.[0] ??
    undefined) as SoftPriorAssessment["dominantPriorLayer"];
  const strongestContribution = [...contributions].sort((left, right) => right.score - left.score)[0];
  const triggeredDrifts = DRIFT_TYPES.filter(
    (driftType) => driftScores[driftType] >= thresholds[driftType]
  );

  return SoftPriorAssessmentSchema.parse({
    driftScores: SoftDriftScoreMapSchema.parse(driftScores),
    thresholds: SoftDriftScoreMapSchema.parse(thresholds),
    dominantPriorLayer,
    triggeredDrifts,
    representativePatternSummary:
      strongestContribution?.representativePatternSummary ??
      `No prior pattern matched for ${input.transition.currentEventType} -> ${input.transition.nextEventType}.`,
    contributions
  });
}
