import { VerdictRecordSchema, type VerdictRecord } from "../domain/index.js";
import {
  buildEvidenceSnapshot,
  renderDeterministicExplanation,
  resolveActiveRuleSet,
  type ActiveRuleSnapshot,
  type CharacterBoundaryFacts,
  type HardConstraintEvaluation
} from "../engine/index.js";
import type { CanonicalStoryGraph } from "../storage/index.js";

interface BuildExplainedVerdictRecordInput {
  graph: CanonicalStoryGraph;
  eventId: string;
  evaluation: HardConstraintEvaluation;
  availableRules: ActiveRuleSnapshot[];
  boundaryFactsByCharacterId?: Record<string, CharacterBoundaryFacts>;
  verdictId?: string;
  runId?: string;
  createdAt?: string;
}

function orderedEvents(graph: CanonicalStoryGraph) {
  return [...graph.events].sort((left, right) => left.sequence - right.sequence);
}

export function buildExplainedVerdictRecord(
  input: BuildExplainedVerdictRecordInput
): VerdictRecord {
  const events = orderedEvents(input.graph);
  const eventIndex = events.findIndex((event) => event.eventId === input.eventId);
  if (eventIndex === -1) {
    throw new Error(`Event not found: ${input.eventId}`);
  }

  const event = events[eventIndex];
  const previousEvent = eventIndex > 0 ? events[eventIndex - 1] : undefined;
  const explicitRuleChanges = event.effects.flatMap((effect) => effect.ruleChanges);
  const activeRules = resolveActiveRuleSet({
    eventId: event.eventId,
    actorIds: event.actorIds,
    placeId: event.placeId,
    availableRules: input.availableRules,
    explicitRuleChanges
  });

  const representativeFinding = input.evaluation.findings[0];
  const evidence = buildEvidenceSnapshot({
    representativeFinding,
    supportingFindings: representativeFinding
      ? input.evaluation.findings.slice(1)
      : input.evaluation.findings,
    notEvaluated: input.evaluation.notEvaluated,
    graph: input.graph,
    event,
    previousEvent,
    activeRules,
    boundaryFactsByCharacterId: input.boundaryFactsByCharacterId
  });

  const explanation = renderDeterministicExplanation({
    verdictKind: input.evaluation.verdictKind,
    representativeChecker: input.evaluation.representativeChecker,
    reasonCode: input.evaluation.reasonCode,
    evidence
  });

  return VerdictRecordSchema.parse({
    verdictId:
      input.verdictId ?? `verdict:${input.graph.revision.revisionId}:${event.sequence}:${event.eventId}`,
    runId: input.runId,
    storyId: input.graph.story.storyId,
    revisionId: input.graph.revision.revisionId,
    verdictKind: input.evaluation.verdictKind,
    category: input.evaluation.category ?? representativeFinding?.category ?? "provenance_gap",
    explanation,
    evidence,
    createdAt: input.createdAt ?? new Date().toISOString()
  });
}
