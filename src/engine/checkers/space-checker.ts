import { ReasonCodes } from "../reason-codes.js";
import {
  buildFinding,
  type ActiveRuleSnapshot,
  type EventCheckContext
} from "../types.js";
import type { SupportingFinding } from "../../domain/index.js";

function hasTravelOverride(activeRules: ActiveRuleSnapshot[]): boolean {
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

    return haystack.includes("teleport") || haystack.includes("instant_travel");
  });
}

function isAncestorPlace(graph: EventCheckContext["graph"], ancestorId: string, placeId: string): boolean {
  let currentPlaceId: string | undefined = placeId;

  while (currentPlaceId) {
    if (currentPlaceId === ancestorId) {
      return true;
    }

    const currentPlace = graph.entities.find(
      (entity) => entity.entityKind === "place" && entity.entityId === currentPlaceId
    );
    currentPlaceId =
      currentPlace?.entityKind === "place" ? currentPlace.parentPlaceId : undefined;
  }

  return false;
}

export function runSpaceChecks(context: EventCheckContext) {
  const findings: SupportingFinding[] = [];

  if (!context.previousEvent) {
    return findings;
  }

  if (!context.previousEvent.placeId || !context.event.placeId) {
    findings.push(
      buildFinding({
        checker: "space",
        reasonCode: ReasonCodes.space.missingLocationContext,
        category: "rule_conflict",
        verdictKind: "Repairable Gap",
        explanation: `Space checks for ${context.event.eventId} require both adjacent events to declare placeId.`,
        eventIds: [context.previousEvent.eventId, context.event.eventId]
      })
    );
    return findings;
  }

  if (
    context.previousEvent.placeId === context.event.placeId ||
    isAncestorPlace(context.graph, context.previousEvent.placeId, context.event.placeId) ||
    isAncestorPlace(context.graph, context.event.placeId, context.previousEvent.placeId)
  ) {
    return findings;
  }

  if (context.event.time.relation !== "same-window" || hasTravelOverride(context.activeRules)) {
    return findings;
  }

  findings.push(
    buildFinding({
      checker: "space",
      reasonCode: ReasonCodes.space.impossibleTravel,
      category: "physical_impossibility",
      verdictKind: "Hard Contradiction",
      explanation: `Events ${context.previousEvent.eventId} and ${context.event.eventId} occupy unrelated places in the same time window.`,
      eventIds: [context.previousEvent.eventId, context.event.eventId]
    })
  );

  return findings;
}
