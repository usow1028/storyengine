import { ReasonCodes } from "../reason-codes.js";
import { buildFinding, type EventCheckContext } from "../types.js";

function eventSubjects(event: EventCheckContext["event"] | undefined): Set<string> {
  if (!event) {
    return new Set();
  }

  const subjects = new Set<string>(event.actorIds);
  for (const effect of event.effects) {
    for (const change of effect.stateChanges) {
      subjects.add(change.subjectId);
    }
  }
  return subjects;
}

function hasStructuredFallback(context: EventCheckContext): boolean {
  if (!context.previousEvent || context.event.time.relation === "before") {
    return false;
  }

  const previousSubjects = eventSubjects(context.previousEvent);
  const currentSubjects = eventSubjects(context.event);
  return [...currentSubjects].some((subject) => previousSubjects.has(subject));
}

export function runCausalityChecks(context: EventCheckContext) {
  const hasExplicitLink =
    context.event.causalLinkIds.length > 0 ||
    context.graph.causalLinks.some((link) => link.effectEventId === context.event.eventId);

  if (hasExplicitLink || hasStructuredFallback(context)) {
    return [];
  }

  const isMajorOutcome =
    context.event.abstract ||
    context.event.targetIds.length > 0 ||
    context.event.effects.some((effect) => effect.stateChanges.length > 0);

  if (!isMajorOutcome) {
    return [];
  }

  return [
    buildFinding({
      checker: "causality",
      reasonCode: context.previousEvent
        ? ReasonCodes.causality.insufficientStateTransition
        : ReasonCodes.causality.missingCausalLink,
      category: "causal_gap",
      verdictKind: "Repairable Gap",
      explanation: context.previousEvent
        ? `Event ${context.event.eventId} lacks a sufficient prior state transition from ${context.previousEvent.eventId}.`
        : `Event ${context.event.eventId} declares a major outcome without a prior causal link.`,
      eventIds: context.previousEvent
        ? [context.previousEvent.eventId, context.event.eventId]
        : [context.event.eventId]
    })
  ];
}
