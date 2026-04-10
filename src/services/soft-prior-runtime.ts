import type {
  GenreWeight,
  RepairCandidate,
  RepairPlausibilityAdjustment,
  SoftPriorAssessment,
  VerdictKind,
  WorldProfile
} from "../domain/index.js";
import type { PriorSnapshotSet, SoftPriorTransitionInput } from "../engine/index.js";
import type { CanonicalStoryGraph } from "../storage/index.js";
import { evaluateSoftPriors } from "./soft-prior-evaluator.js";

export type SoftPriorRuntimeStatus = "available" | "disabled" | "missing_snapshot" | "invalid_snapshot" | "insufficient_context";

export interface SoftPriorRuntimeConfig {
  enabled?: boolean;
  snapshotDir?: string;
  snapshotSet?: PriorSnapshotSet;
  genreWeights?: GenreWeight[];
  worldProfile?: WorldProfile;
}

export interface SoftPriorUnavailableResult {
  status: Exclude<SoftPriorRuntimeStatus, "available">;
}

export interface SoftPriorAvailableResult {
  status: "available";
  assessment: SoftPriorAssessment;
  rerankedRepairs: RepairCandidate[];
  repairPlausibilityAdjustments: RepairPlausibilityAdjustment[];
}

export type SoftPriorAdvisoryResult =
  | SoftPriorUnavailableResult
  | SoftPriorAvailableResult;

interface EvaluateConfiguredSoftPriorInput {
  graph: CanonicalStoryGraph;
  repairs: RepairCandidate[];
  softPriorConfig?: SoftPriorRuntimeConfig;
  hardVerdictKind?: VerdictKind;
}

interface CandidateEvaluation extends SoftPriorAvailableResult {
  maxDriftScore: number;
  contributionCount: number;
}

const DEFAULT_GENRE_WEIGHTS: GenreWeight[] = [{ genreKey: "baseline", weight: 1 }];
const WORLD_PROFILES = new Set<WorldProfile>([
  "reality-default",
  "fantasy-light",
  "sci-fi-override"
]);

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function isWorldProfile(value: string): value is WorldProfile {
  return WORLD_PROFILES.has(value as WorldProfile);
}

function resolveWorldProfile(
  graph: CanonicalStoryGraph,
  config?: SoftPriorRuntimeConfig
): WorldProfile {
  if (config?.worldProfile) {
    return config.worldProfile;
  }

  const storyDefault = graph.story.defaultRulePackName;
  return isWorldProfile(storyDefault) ? storyDefault : "reality-default";
}

function stateChangeToken(input: { field: string; operation: string; value: unknown }): string {
  return `${input.field}:${input.operation}:${String(input.value ?? "unknown")}`;
}

function maxDriftScore(assessment: SoftPriorAssessment): number {
  return Math.max(...Object.values(assessment.driftScores));
}

function isMissingSnapshotError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
}

function shouldReplaceBestCandidate(
  current: CandidateEvaluation,
  best?: CandidateEvaluation
): boolean {
  if (!best) {
    return true;
  }

  return (
    current.maxDriftScore > best.maxDriftScore ||
    (current.maxDriftScore === best.maxDriftScore &&
      current.contributionCount > best.contributionCount)
  );
}

export function buildSoftPriorTransitionInputs(
  graph: CanonicalStoryGraph,
  config?: SoftPriorRuntimeConfig
): SoftPriorTransitionInput[] {
  const events = [...graph.events].sort((left, right) => left.sequence - right.sequence);
  const transitions: SoftPriorTransitionInput[] = [];
  const genreWeights = config?.genreWeights ?? DEFAULT_GENRE_WEIGHTS;
  const worldProfile = resolveWorldProfile(graph, config);

  for (let index = 0; index < events.length - 1; index += 1) {
    const current = events[index];
    const next = events[index + 1];
    if (!current || !next) {
      continue;
    }

    const nextStateChanges = next.effects.flatMap((effect) => effect.stateChanges);
    const currentRuleChanges = current.effects.flatMap((effect) => effect.ruleChanges);
    const nextRuleChanges = next.effects.flatMap((effect) => effect.ruleChanges);

    transitions.push({
      currentEventType: current.eventType,
      nextEventType: next.eventType,
      stateAxes: uniqueSorted(nextStateChanges.map((change) => change.field)),
      stateTransitionTokens: uniqueSorted(nextStateChanges.map((change) => stateChangeToken(change))),
      worldRuleExceptionTokens: uniqueSorted(
        [...currentRuleChanges, ...nextRuleChanges].map((change) => change.ruleVersionId)
      ),
      preconditionTokens: uniqueSorted(
        next.preconditions.map(
          (precondition) => precondition.requiredRuleVersionId ?? precondition.description
        )
      ),
      genreWeights,
      worldProfile
    });
  }

  return transitions;
}

export async function evaluateConfiguredSoftPrior(
  input: EvaluateConfiguredSoftPriorInput
): Promise<SoftPriorAdvisoryResult> {
  const config = input.softPriorConfig;
  if (config?.enabled !== true) {
    return { status: "disabled" };
  }

  const transitions = buildSoftPriorTransitionInputs(input.graph, config);
  if (transitions.length === 0) {
    return { status: "insufficient_context" };
  }

  if (!config.snapshotSet && !config.snapshotDir) {
    return { status: "missing_snapshot" };
  }

  let bestCandidate: CandidateEvaluation | undefined;

  for (const transition of transitions) {
    try {
      const result = await evaluateSoftPriors({
        snapshotDir: config.snapshotDir ?? config.snapshotSet?.snapshotDir ?? "",
        transition,
        repairs: input.repairs,
        hardVerdictKind: input.hardVerdictKind,
        snapshotSet: config.snapshotSet
      });
      const candidate: CandidateEvaluation = {
        status: "available",
        assessment: result.assessment,
        rerankedRepairs: result.rerankedRepairs,
        repairPlausibilityAdjustments: result.adjustments,
        maxDriftScore: maxDriftScore(result.assessment),
        contributionCount: result.assessment.contributions.length
      };

      if (shouldReplaceBestCandidate(candidate, bestCandidate)) {
        bestCandidate = candidate;
      }
    } catch (error) {
      if (isMissingSnapshotError(error)) {
        return { status: "missing_snapshot" };
      }

      return { status: "invalid_snapshot" };
    }
  }

  if (!bestCandidate) {
    return { status: "insufficient_context" };
  }

  return {
    status: "available",
    assessment: bestCandidate.assessment,
    rerankedRepairs: bestCandidate.rerankedRepairs,
    repairPlausibilityAdjustments: bestCandidate.repairPlausibilityAdjustments
  };
}
