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

function hasOverride(activeRules: ActiveRuleSnapshot[], token: string): boolean {
  return activeRules.some((rule) => {
    const haystack = [
      rule.metadata.name,
      rule.metadata.description,
      rule.metadata.sourceText,
      rule.version?.normalizedText,
      ...(rule.version?.effects ?? [])
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(token);
  });
}

export function runPhysicsChecks(context: EventCheckContext) {
  const findings = [];
  const restrictedPlace =
    context.event.placeId !== undefined
      ? context.graph.entities.find(
          (entity) => entity.entityKind === "place" && entity.entityId === context.event.placeId
        )
      : undefined;

  for (const actorId of context.event.actorIds) {
    const facts = context.boundaryFactsByCharacterId?.[actorId];
    const missingRequiredRule = hasMissingRequiredRule(context);

    if (facts?.aliveStatus === "dead" && !hasOverride(context.activeRules, "resurrection")) {
      findings.push(
        buildFinding({
          checker: "physics",
          reasonCode: missingRequiredRule
            ? ReasonCodes.physics.ruleOverrideRequired
            : ReasonCodes.physics.physicalRuleBlocked,
          category: missingRequiredRule ? "rule_conflict" : "physical_impossibility",
          verdictKind: missingRequiredRule ? "Repairable Gap" : "Hard Contradiction",
          explanation: `Actor ${actorId} cannot participate in ${context.event.eventId} while marked dead.`,
          eventIds: [context.event.eventId]
        })
      );
      continue;
    }

    if (
      restrictedPlace?.entityKind === "place" &&
      restrictedPlace.movementClass === "restricted" &&
      facts?.locationId !== context.event.placeId &&
      !hasOverride(context.activeRules, "allow_restricted_entry")
    ) {
      findings.push(
        buildFinding({
          checker: "physics",
          reasonCode: missingRequiredRule
            ? ReasonCodes.physics.ruleOverrideRequired
            : ReasonCodes.physics.physicalRuleBlocked,
          category: missingRequiredRule ? "rule_conflict" : "physical_impossibility",
          verdictKind: missingRequiredRule ? "Repairable Gap" : "Hard Contradiction",
          explanation: `Actor ${actorId} cannot enter restricted place ${context.event.placeId} without an active override.`,
          eventIds: [context.event.eventId]
        })
      );
    }
  }

  return findings;
}
