import type { CanonicalStoryGraph } from "../storage/index.js";
import { runCausalityChecks } from "./checkers/causality-checker.js";
import { runCharacterChecks } from "./checkers/character-checker.js";
import { runPhysicsChecks } from "./checkers/physics-checker.js";
import { runSpaceChecks } from "./checkers/space-checker.js";
import { runTimeChecks } from "./checkers/time-checker.js";
import { blockedCheckerKinds, resolveActiveRuleSet } from "./rule-activation.js";
import { aggregateFindings } from "./verdict-aggregator.js";
import {
  buildNotEvaluated,
  type ActiveRuleSnapshot,
  type CharacterBoundaryFacts
} from "./types.js";

interface EvaluateEventPathInput {
  graph: CanonicalStoryGraph;
  eventId: string;
  availableRules: ActiveRuleSnapshot[];
  boundaryFactsByCharacterId?: Record<string, CharacterBoundaryFacts>;
}

interface EvaluateRevisionInput {
  graph: CanonicalStoryGraph;
  availableRules: ActiveRuleSnapshot[];
  boundaryFactsByEventId?: Record<string, Record<string, CharacterBoundaryFacts>>;
}

function orderedEvents(graph: CanonicalStoryGraph) {
  return [...graph.events].sort((left, right) => left.sequence - right.sequence);
}

export async function evaluateEventPath(input: EvaluateEventPathInput) {
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

  const baseContext = {
    graph: input.graph,
    event,
    previousEvent,
    activeRules,
    boundaryFactsByCharacterId: input.boundaryFactsByCharacterId
  };

  const findings = [
    ...runTimeChecks(baseContext),
    ...runSpaceChecks(baseContext),
    ...runPhysicsChecks(baseContext)
  ];
  const upstreamHardFinding = findings.find((finding) => finding.verdictKind === "Hard Contradiction");
  const notEvaluated = upstreamHardFinding
    ? blockedCheckerKinds().map((checker) =>
        buildNotEvaluated(
          checker,
          upstreamHardFinding.checker,
          upstreamHardFinding.reasonCode,
          `${checker} checks were skipped because ${upstreamHardFinding.checker} produced a hard contradiction first.`
        )
      )
    : [];

  if (!upstreamHardFinding) {
    findings.push(...runCausalityChecks(baseContext));
    findings.push(...runCharacterChecks(baseContext));
  }

  return aggregateFindings({
    findings,
    notEvaluated
  });
}

export async function evaluateRevision(input: EvaluateRevisionInput) {
  const events = orderedEvents(input.graph);
  const evaluations = [];

  for (const event of events) {
    evaluations.push(
      await evaluateEventPath({
        graph: input.graph,
        eventId: event.eventId,
        availableRules: input.availableRules,
        boundaryFactsByCharacterId: input.boundaryFactsByEventId?.[event.eventId]
      })
    );
  }

  return evaluations;
}
