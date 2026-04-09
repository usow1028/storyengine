import { z } from "zod";

export const PriorLayerSchema = z.enum(["baseline", "genre"]);
export type PriorLayer = z.infer<typeof PriorLayerSchema>;

export const WorldProfileSchema = z.enum([
  "reality-default",
  "fantasy-light",
  "sci-fi-override"
]);
export type WorldProfile = z.infer<typeof WorldProfileSchema>;

export const GenreWeightSchema = z.object({
  genreKey: z.string().min(1),
  weight: z.number().positive().max(1)
});
export type GenreWeight = z.infer<typeof GenreWeightSchema>;

export const CorpusWorkSchema = z.object({
  workId: z.string().min(1),
  title: z.string().min(1),
  genreWeights: z.array(GenreWeightSchema).min(1),
  worldProfile: WorldProfileSchema,
  commerciallyValidated: z.boolean().default(true),
  criticallyValidated: z.boolean().default(false)
});
export type CorpusWork = z.infer<typeof CorpusWorkSchema>;

export const NormalizedTransitionPatternSchema = z.object({
  patternKey: z.string().min(1),
  currentEventType: z.string().min(1),
  nextEventType: z.string().min(1),
  stateAxes: z.array(z.string().min(1)).default([]),
  stateTransitionTokens: z.array(z.string().min(1)).default([]),
  worldRuleExceptionTokens: z.array(z.string().min(1)).default([]),
  preconditionTokens: z.array(z.string().min(1)).default([]),
  representativePatternSummary: z.string().min(1),
  sampleCount: z.number().int().positive(),
  sourceWorkIds: z.array(z.string().min(1)).default([])
});
export type NormalizedTransitionPattern = z.infer<typeof NormalizedTransitionPatternSchema>;

export const DriftPatternSchema = z.object({
  patternKey: z.string().min(1),
  driftType: z.string().min(1),
  currentEventType: z.string().min(1),
  nextEventType: z.string().min(1),
  stateAxes: z.array(z.string().min(1)).default([]),
  triggerTokens: z.array(z.string().min(1)).default([]),
  representativePatternSummary: z.string().min(1),
  sampleCount: z.number().int().positive(),
  sourceWorkIds: z.array(z.string().min(1)).default([])
});
export type DriftPattern = z.infer<typeof DriftPatternSchema>;

export const PriorSnapshotSchema = z.object({
  snapshotId: z.string().min(1),
  layer: PriorLayerSchema,
  genreKey: z.string().min(1),
  worldProfile: WorldProfileSchema,
  sampleCount: z.number().int().nonnegative(),
  builtAt: z.string().min(1),
  sourceWorkIds: z.array(z.string().min(1)).default([]),
  positivePatterns: z.array(NormalizedTransitionPatternSchema).default([]),
  driftPatterns: z.array(DriftPatternSchema).default([]),
  genreWeights: z.array(GenreWeightSchema).default([])
});
export type PriorSnapshot = z.infer<typeof PriorSnapshotSchema>;

export const PriorSnapshotArtifactSchema = z.object({
  snapshotVersion: z.string().min(1),
  layer: PriorLayerSchema,
  exportedAt: z.string().min(1),
  snapshots: z.array(PriorSnapshotSchema).default([])
});
export type PriorSnapshotArtifact = z.infer<typeof PriorSnapshotArtifactSchema>;

export const NormalizedCorpusTransitionSchema = z.object({
  workId: z.string().min(1),
  title: z.string().min(1),
  genreWeights: z.array(GenreWeightSchema).min(1),
  genreKey: z.string().min(1),
  worldProfile: WorldProfileSchema,
  currentEventId: z.string().min(1),
  currentEventType: z.string().min(1),
  nextEventId: z.string().min(1),
  nextEventType: z.string().min(1),
  stateAxes: z.array(z.string().min(1)).default([]),
  stateTransitionTokens: z.array(z.string().min(1)).default([]),
  worldRuleExceptionTokens: z.array(z.string().min(1)).default([]),
  preconditionTokens: z.array(z.string().min(1)).default([]),
  representativePatternSummary: z.string().min(1)
});
export type NormalizedCorpusTransition = z.infer<typeof NormalizedCorpusTransitionSchema>;

export const NormalizedCorpusWorkSchema = CorpusWorkSchema.extend({
  genreKey: z.string().min(1),
  transitions: z.array(NormalizedCorpusTransitionSchema).default([])
});
export type NormalizedCorpusWork = z.infer<typeof NormalizedCorpusWorkSchema>;

export const SoftDriftTypeSchema = z.enum([
  "transition_drift",
  "motivation_drift",
  "rule_exception_rarity"
]);
export type SoftDriftType = z.infer<typeof SoftDriftTypeSchema>;

export const SoftDriftScoreMapSchema = z.object({
  transition_drift: z.number().min(0).max(1),
  motivation_drift: z.number().min(0).max(1),
  rule_exception_rarity: z.number().min(0).max(1)
});
export type SoftDriftScoreMap = z.infer<typeof SoftDriftScoreMapSchema>;

export const PriorContributionSchema = z.object({
  layer: PriorLayerSchema,
  genreKey: z.string().min(1),
  worldProfile: WorldProfileSchema,
  driftType: SoftDriftTypeSchema,
  sampleCount: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
  appliedWeight: z.number().min(0).max(1),
  score: z.number().min(0).max(1),
  threshold: z.number().min(0).max(1),
  patternKey: z.string().min(1).optional(),
  representativePatternSummary: z.string().min(1)
});
export type PriorContribution = z.infer<typeof PriorContributionSchema>;

export const SoftPriorAssessmentSchema = z.object({
  driftScores: SoftDriftScoreMapSchema,
  thresholds: SoftDriftScoreMapSchema,
  dominantPriorLayer: PriorLayerSchema.optional(),
  triggeredDrifts: z.array(SoftDriftTypeSchema).default([]),
  representativePatternSummary: z.string().min(1),
  contributions: z.array(PriorContributionSchema).default([])
});
export type SoftPriorAssessment = z.infer<typeof SoftPriorAssessmentSchema>;

export const RepairPlausibilityAdjustmentSchema = z.object({
  repairId: z.string().min(1),
  adjustment: z.number().min(-1).max(1),
  confidence: z.number().min(0).max(1),
  dominantPriorLayer: PriorLayerSchema.optional(),
  representativePatternSummary: z.string().min(1)
});
export type RepairPlausibilityAdjustment = z.infer<typeof RepairPlausibilityAdjustmentSchema>;

function slugifyKeyPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createGenreKey(genreWeights: GenreWeight[]): string {
  return [...genreWeights]
    .filter((weight) => weight.weight > 0)
    .sort((left, right) =>
      left.genreKey.localeCompare(right.genreKey) || right.weight - left.weight
    )
    .map((weight) => `${slugifyKeyPart(weight.genreKey)}-${Math.round(weight.weight * 100)}`)
    .join("__");
}

export function createTransitionPatternKey(input: {
  currentEventType: string;
  nextEventType: string;
  stateTransitionTokens?: string[];
  worldRuleExceptionTokens?: string[];
  preconditionTokens?: string[];
}): string {
  return [
    slugifyKeyPart(input.currentEventType),
    slugifyKeyPart(input.nextEventType),
    [...(input.stateTransitionTokens ?? [])].sort().join("+") || "no-state-transition",
    [...(input.worldRuleExceptionTokens ?? [])].sort().join("+") || "no-rule-exception",
    [...(input.preconditionTokens ?? [])].sort().join("+") || "no-preconditions"
  ].join("::");
}

export function createDriftPatternKey(input: {
  driftType: string;
  currentEventType: string;
  nextEventType: string;
  triggerTokens?: string[];
}): string {
  return [
    slugifyKeyPart(input.driftType),
    slugifyKeyPart(input.currentEventType),
    slugifyKeyPart(input.nextEventType),
    [...(input.triggerTokens ?? [])].sort().join("+") || "no-triggers"
  ].join("::");
}

export function createPriorSnapshotId(input: {
  snapshotVersion: string;
  layer: PriorLayer;
  genreKey: string;
  worldProfile: WorldProfile;
}): string {
  return `${input.snapshotVersion}:${input.layer}:${input.genreKey}:${input.worldProfile}`;
}

export function createPriorArtifactFilename(layer: PriorLayer, genreKey?: string): string {
  if (layer === "baseline") {
    return "baseline.prior.json";
  }

  if (!genreKey) {
    throw new Error("Genre prior exports require a genre key.");
  }

  return `genre-${genreKey}.prior.json`;
}
