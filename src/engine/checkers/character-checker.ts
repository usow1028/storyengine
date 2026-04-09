import { ReasonCodes } from "../reason-codes.js";
import { buildFinding, type EventCheckContext } from "../types.js";

const COUNTERMOTIVE_TOKENS = [
  "coerc",
  "threat",
  "blackmail",
  "obligation",
  "promise",
  "protect",
  "hostage"
];

function hasCounterMotive(context: EventCheckContext, actorId: string): boolean {
  const facts = context.boundaryFactsByCharacterId?.[actorId];
  const values = [
    ...(facts?.knowledge ?? []),
    ...(facts?.goals ?? []),
    ...(facts?.conditions ?? []),
    ...context.event.effects.flatMap((effect) =>
      effect.stateChanges
        .filter((change) => change.subjectId === actorId && change.field === "conditions")
        .map((change) => String(change.value))
    )
  ]
    .join(" ")
    .toLowerCase();

  return COUNTERMOTIVE_TOKENS.some((token) => values.includes(token));
}

function isLoyaltyReversal(context: EventCheckContext, actorId: string): boolean {
  const facts = context.boundaryFactsByCharacterId?.[actorId];
  if (!facts) {
    return false;
  }

  const removedLoyalties = context.event.effects.flatMap((effect) =>
    effect.stateChanges
      .filter(
        (change) =>
          change.subjectId === actorId &&
          change.field === "loyalties" &&
          change.operation === "remove"
      )
      .map((change) => String(change.value))
  );

  const candidateTargets = new Set<string>([...removedLoyalties, ...context.event.targetIds]);
  return [...candidateTargets].some((targetId) => facts.loyalties.includes(targetId));
}

export function runCharacterChecks(context: EventCheckContext) {
  const findings = [];

  for (const actorId of context.event.actorIds) {
    const facts = context.boundaryFactsByCharacterId?.[actorId];
    if (!facts) {
      findings.push(
        buildFinding({
          checker: "character",
          reasonCode: ReasonCodes.character.missingCharacterContext,
          category: "character_state_contradiction",
          verdictKind: "Repairable Gap",
          explanation: `Character check for actor ${actorId} requires prior boundary facts.`,
          eventIds: [context.event.eventId]
        })
      );
      continue;
    }

    if (isLoyaltyReversal(context, actorId) && !hasCounterMotive(context, actorId)) {
      findings.push(
        buildFinding({
          checker: "character",
          reasonCode: ReasonCodes.character.loyaltyReversalWithoutCause,
          category: "character_state_contradiction",
          verdictKind: "Hard Contradiction",
          explanation: `Actor ${actorId} reverses loyalty in ${context.event.eventId} without a counter-motive or new constraint.`,
          eventIds: [context.event.eventId]
        })
      );
    }
  }

  return findings;
}
