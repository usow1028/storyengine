import {
  VerdictEvidenceSchema,
  type CanonicalEvent,
  type MissingPremise,
  type StateEvidenceSummary,
  type StateEvidenceValues
} from "../domain/index.js";
import type { BuildEvidenceSnapshotInput, CharacterBoundaryFacts } from "./types.js";

const AXIS_ORDER = [
  "locationId",
  "aliveStatus",
  "knowledge",
  "goals",
  "loyalties",
  "resources",
  "conditions"
] as const;

const RELEVANT_AXES_BY_REASON: Record<string, string[]> = {
  impossible_travel: ["locationId"],
  invalid_temporal_anchor: ["locationId"],
  physical_rule_blocked: ["aliveStatus", "locationId"],
  rule_override_required: ["locationId", "aliveStatus", "conditions"],
  missing_causal_link: ["goals", "conditions"],
  insufficient_state_transition: ["goals", "conditions", "knowledge"],
  loyalty_reversal_without_cause: ["loyalties", "conditions", "goals", "knowledge"],
  missing_character_context: ["loyalties", "goals", "knowledge", "conditions"],
  missing_location_context: ["locationId"]
};

function lastOf<T>(values: T[]): T | undefined {
  return values.length > 0 ? values[values.length - 1] : undefined;
}

function uniqueStrings(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function eventStateChangesForCharacter(event: CanonicalEvent | undefined, characterId: string) {
  if (!event) {
    return [];
  }

  return event.effects.flatMap((effect) =>
    effect.stateChanges.filter((change) => change.subjectId === characterId)
  );
}

function eventTouchesRelevantAxes(
  event: CanonicalEvent | undefined,
  characterId: string,
  relevantAxes: string[]
): boolean {
  const changes = eventStateChangesForCharacter(event, characterId);
  return changes.some((change) => relevantAxes.includes(change.field));
}

function deriveRelevantAxes(
  input: BuildEvidenceSnapshotInput,
  characterId: string,
  facts: CharacterBoundaryFacts | undefined
): string[] {
  const axes = new Set<string>(RELEVANT_AXES_BY_REASON[input.representativeFinding?.reasonCode ?? ""] ?? []);

  for (const change of eventStateChangesForCharacter(input.event, characterId)) {
    axes.add(change.field);
  }

  if ([...axes].includes("loyalties")) {
    const hasCounterMotive =
      (facts?.conditions.length ?? 0) > 0 ||
      (facts?.knowledge.length ?? 0) > 0 ||
      (facts?.goals.length ?? 0) > 0;
    if (hasCounterMotive) {
      axes.add("conditions");
      axes.add("knowledge");
      axes.add("goals");
    }
  }

  if (axes.size === 0 && facts) {
    if (facts.locationId) {
      axes.add("locationId");
    }
    if (facts.loyalties.length > 0) {
      axes.add("loyalties");
    }
    if (facts.conditions.length > 0) {
      axes.add("conditions");
    }
  }

  return AXIS_ORDER.filter((axis) => axes.has(axis));
}

function buildStateValues(facts: CharacterBoundaryFacts | undefined, relevantAxes: string[]): StateEvidenceValues {
  if (!facts) {
    return {};
  }

  const values: Partial<StateEvidenceValues> = {};
  for (const axis of relevantAxes) {
    switch (axis) {
      case "locationId":
        values.locationId = facts.locationId;
        break;
      case "aliveStatus":
        values.aliveStatus = facts.aliveStatus;
        break;
      case "knowledge":
        values.knowledge = [...facts.knowledge];
        break;
      case "goals":
        values.goals = [...facts.goals];
        break;
      case "loyalties":
        values.loyalties = [...facts.loyalties];
        break;
      case "resources":
        values.resources = [...facts.resources];
        break;
      case "conditions":
        values.conditions = [...facts.conditions];
        break;
      default:
        break;
    }
  }

  return values;
}

function buildStateSummary(
  input: BuildEvidenceSnapshotInput,
  characterId: string,
  facts: CharacterBoundaryFacts | undefined
): StateEvidenceSummary | undefined {
  const relevantAxes = deriveRelevantAxes(input, characterId, facts);
  if (!facts && relevantAxes.length === 0) {
    return undefined;
  }

  const previousBoundaryId =
    facts?.stateBoundaryIds.length && facts.stateBoundaryIds.length > 1
      ? facts.stateBoundaryIds[facts.stateBoundaryIds.length - 2]
      : lastOf(facts?.stateBoundaryIds ?? []);
  const priorEventIdFromFacts = lastOf(facts?.sourceEventIds ?? []);
  const previousSourceEventId =
    priorEventIdFromFacts ??
    (eventTouchesRelevantAxes(input.previousEvent, characterId, relevantAxes)
      ? input.previousEvent?.eventId
      : undefined);

  return {
    characterId,
    stateBoundaryId: lastOf(facts?.stateBoundaryIds ?? []),
    previousBoundaryId,
    previousSourceEventId,
    relevantAxes,
    values: buildStateValues(facts, relevantAxes)
  };
}

function buildMissingPremises(input: BuildEvidenceSnapshotInput): MissingPremise[] {
  const reasonCode = input.representativeFinding?.reasonCode;
  if (!reasonCode) {
    return [];
  }

  switch (reasonCode) {
    case "invalid_temporal_anchor":
      return input.event.time.anchorEventId
        ? [
            {
              kind: "missing_anchor",
              description: `Anchor event ${input.event.time.anchorEventId} must exist before this event can be ordered.`,
              relatedEventId: input.event.time.anchorEventId
            }
          ]
        : [];
    case "missing_location_context": {
      const premises: MissingPremise[] = [];
      if (!input.previousEvent?.placeId) {
        premises.push({
          kind: "missing_context",
          description: `Previous event ${input.previousEvent?.eventId ?? "unknown"} is missing place context.`,
          relatedEventId: input.previousEvent?.eventId
        });
      }
      if (!input.event.placeId) {
        premises.push({
          kind: "missing_context",
          description: `Current event ${input.event.eventId} is missing place context.`,
          relatedEventId: input.event.eventId
        });
      }
      return premises;
    }
    case "missing_character_context":
      return input.event.actorIds
        .filter((actorId) => input.boundaryFactsByCharacterId?.[actorId] === undefined)
        .map((actorId) => ({
          kind: "missing_context" as const,
          description: `Character ${actorId} needs prior boundary facts before this event can be checked.`,
          relatedCharacterId: actorId,
          relatedEventId: input.event.eventId
        }));
    case "missing_causal_link":
      return [
        {
          kind: "missing_prior_event",
          description: `Event ${input.event.eventId} needs a prior causal event or explicit causal link.`,
          relatedEventId: input.event.eventId
        }
      ];
    case "insufficient_state_transition":
      return [
        {
          kind: "missing_prior_event",
          description: `Event ${input.event.eventId} needs an intermediate cause or state transition after ${input.previousEvent?.eventId ?? "the prior event"}.`,
          relatedEventId: input.event.eventId
        }
      ];
    case "rule_override_required": {
      const requiredRules = input.event.preconditions
        .map((precondition) => precondition.requiredRuleVersionId)
        .filter((ruleVersionId): ruleVersionId is string => Boolean(ruleVersionId))
        .filter(
          (ruleVersionId) =>
            !input.activeRules.some((rule) => rule.version?.ruleVersionId === ruleVersionId)
        );
      return requiredRules.map((ruleVersionId) => ({
        kind: "missing_rule" as const,
        description: `Rule ${ruleVersionId} must be active before ${input.event.eventId}.`,
        relatedEventId: input.event.eventId,
        relatedRuleVersionId: ruleVersionId
      }));
    }
    case "loyalty_reversal_without_cause":
      return [
        {
          kind: "missing_assumption",
          description: `Event ${input.event.eventId} needs a counter-motive, threat, or obligation to justify the loyalty reversal.`,
          relatedEventId: input.event.eventId,
          relatedCharacterId: input.event.actorIds[0]
        }
      ];
    default:
      return [];
  }
}

function orderedEventIds(input: BuildEvidenceSnapshotInput): string[] {
  const sourceEventIds = uniqueStrings([
    ...(input.representativeFinding?.evidence.eventIds ?? []),
    ...input.supportingFindings.flatMap((finding) => finding.evidence.eventIds),
    input.previousEvent?.eventId,
    input.event.eventId
  ]);

  const sequenceById = new Map(
    input.graph.events.map((event) => [event.eventId, event.sequence] as const)
  );

  return sourceEventIds.sort(
    (left, right) => (sequenceById.get(left) ?? Number.MAX_SAFE_INTEGER) - (sequenceById.get(right) ?? Number.MAX_SAFE_INTEGER)
  );
}

function buildConflictPath(input: BuildEvidenceSnapshotInput, eventIds: string[]): string[] {
  if (input.representativeFinding?.reasonCode === "invalid_temporal_anchor" && input.event.time.anchorEventId) {
    return [input.event.eventId, input.event.time.anchorEventId];
  }

  if (eventIds.length > 0) {
    return eventIds;
  }

  return [input.event.eventId];
}

export function buildEvidenceSnapshot(input: BuildEvidenceSnapshotInput) {
  const eventIds = orderedEventIds(input);
  const stateBoundaryIds = uniqueStrings([
    ...(input.representativeFinding?.evidence.stateBoundaryIds ?? []),
    ...input.supportingFindings.flatMap((finding) => finding.evidence.stateBoundaryIds),
    ...Object.values(input.boundaryFactsByCharacterId ?? {}).flatMap((facts) => facts.stateBoundaryIds)
  ]);
  const ruleVersionIds = uniqueStrings([
    ...(input.representativeFinding?.evidence.ruleVersionIds ?? []),
    ...input.supportingFindings.flatMap((finding) => finding.evidence.ruleVersionIds)
  ]);
  const provenanceIds = uniqueStrings([
    ...(input.representativeFinding?.evidence.provenanceIds ?? []),
    ...input.supportingFindings.flatMap((finding) => finding.evidence.provenanceIds),
    ...Object.values(input.boundaryFactsByCharacterId ?? {}).flatMap((facts) => facts.provenanceIds)
  ]);

  const eventSummaries = eventIds
    .map((eventId) => input.graph.events.find((event) => event.eventId === eventId))
    .filter((event): event is CanonicalEvent => Boolean(event))
    .map((event) => ({
      eventId: event.eventId,
      eventType: event.eventType,
      sequence: event.sequence,
      abstract: event.abstract,
      placeId: event.placeId,
      actorIds: [...event.actorIds],
      targetIds: [...event.targetIds],
      timeRelation: event.time.relation
    }));

  const relatedCharacterIds = uniqueStrings([
    ...input.event.actorIds,
    ...input.event.targetIds,
    ...Object.keys(input.boundaryFactsByCharacterId ?? {})
  ]);
  const stateSummaries = relatedCharacterIds
    .map((characterId) =>
      buildStateSummary(input, characterId, input.boundaryFactsByCharacterId?.[characterId])
    )
    .filter((summary): summary is StateEvidenceSummary => Boolean(summary));

  const ruleSummaries = ruleVersionIds
    .map((ruleVersionId) =>
      input.activeRules.find((rule) => rule.version?.ruleVersionId === ruleVersionId)
    )
    .filter((rule): rule is NonNullable<typeof rule> => Boolean(rule))
    .map((rule) => ({
      rulePackId: rule.metadata.rulePackId,
      ruleVersionId: rule.version?.ruleVersionId,
      name: rule.metadata.name,
      scope: rule.metadata.scope,
      scopeTargetId: rule.metadata.scopeTargetId,
      worldAffiliation: rule.metadata.worldAffiliation,
      active: rule.metadata.active,
      effects: [...(rule.version?.effects ?? [])]
    }));

  return VerdictEvidenceSchema.parse({
    eventIds,
    stateBoundaryIds,
    ruleVersionIds,
    provenanceIds,
    representativeChecker: input.representativeFinding?.checker,
    reasonCode: input.representativeFinding?.reasonCode,
    eventSummaries,
    stateSummaries,
    ruleSummaries,
    conflictPath: buildConflictPath(input, eventIds),
    missingPremises: buildMissingPremises(input),
    supportingFindings: input.supportingFindings,
    notEvaluated: input.notEvaluated
  });
}
