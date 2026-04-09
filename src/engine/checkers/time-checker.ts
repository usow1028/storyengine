import { ReasonCodes } from "../reason-codes.js";
import { buildFinding, type ActiveRuleSnapshot, type EventCheckContext } from "../types.js";

function hasActiveRuleVersion(activeRules: ActiveRuleSnapshot[], ruleVersionId: string): boolean {
  return activeRules.some((rule) => rule.version?.ruleVersionId === ruleVersionId);
}

function hasMissingRequiredRule(context: EventCheckContext): boolean {
  return context.event.preconditions.some(
    (precondition) =>
      precondition.requiredRuleVersionId !== undefined &&
      !hasActiveRuleVersion(context.activeRules, precondition.requiredRuleVersionId)
  );
}

function hasTravelOverride(activeRules: ActiveRuleSnapshot[]): boolean {
  return activeRules.some((rule) => {
    const haystack = [
      rule.metadata.name,
      rule.metadata.description,
      rule.metadata.sourceText,
      rule.version?.executableRef,
      rule.version?.normalizedText,
      ...(rule.version?.conditions ?? []),
      ...(rule.version?.effects ?? [])
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes("teleport") || haystack.includes("instant_travel");
  });
}

export function runTimeChecks(context: EventCheckContext) {
  const findings = [];
  const anchorEventId = context.event.time.anchorEventId;

  if (anchorEventId && !context.graph.events.some((event) => event.eventId === anchorEventId)) {
    findings.push(
      buildFinding({
        checker: "time",
        reasonCode: ReasonCodes.time.invalidTemporalAnchor,
        category: "temporal_contradiction",
        verdictKind: "Hard Contradiction",
        explanation: `Event ${context.event.eventId} references missing anchor ${anchorEventId}.`,
        eventIds: [context.event.eventId]
      })
    );
  }

  if (!context.previousEvent) {
    return findings;
  }

  const placesDiffer =
    context.previousEvent.placeId !== undefined &&
    context.event.placeId !== undefined &&
    context.previousEvent.placeId !== context.event.placeId;

  if (!placesDiffer) {
    return findings;
  }

  const travelOverride = hasTravelOverride(context.activeRules);
  const missingRequiredRule = hasMissingRequiredRule(context);
  const insufficientTravelTime =
    context.event.time.minTravelMinutes !== undefined &&
    (context.event.time.durationMinutes ?? 0) < context.event.time.minTravelMinutes;
  const sameWindowTravel = context.event.time.relation === "same-window";

  if (!insufficientTravelTime && !sameWindowTravel) {
    return findings;
  }

  if (travelOverride) {
    return findings;
  }

  const verdictKind = missingRequiredRule ? "Repairable Gap" : "Hard Contradiction";
  const category = missingRequiredRule ? "rule_conflict" : "temporal_contradiction";
  const reasonCode = missingRequiredRule
    ? ReasonCodes.physics.ruleOverrideRequired
    : ReasonCodes.time.impossibleTravel;

  findings.push(
    buildFinding({
      checker: "time",
      reasonCode,
      category,
      verdictKind,
      explanation: insufficientTravelTime
        ? `Event ${context.event.eventId} requires ${context.event.time.minTravelMinutes} minutes of travel but only provides ${context.event.time.durationMinutes ?? 0}.`
        : `Events ${context.previousEvent.eventId} and ${context.event.eventId} occupy different places in the same time window.`,
      eventIds: [context.previousEvent.eventId, context.event.eventId],
      ruleVersionIds: context.activeRules.flatMap((rule) =>
        rule.version ? [rule.version.ruleVersionId] : []
      )
    })
  );

  return findings;
}
