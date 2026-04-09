import {
  CorpusWorkSchema,
  type CorpusEventRow,
  type CorpusStateTransition,
  type CorpusWork
} from "./types.js";
import {
  createGenreKey,
  NormalizedCorpusTransitionSchema,
  NormalizedCorpusWorkSchema,
  type NormalizedCorpusTransition,
  type NormalizedCorpusWork
} from "../domain/priors.js";

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function transitionValueToken(transition: CorpusStateTransition): string {
  return transition.toValue ?? transition.value ?? transition.fromValue ?? "unknown";
}

function transitionToken(transition: CorpusStateTransition): string {
  return `${transition.axis}:${transition.operation}:${transitionValueToken(transition)}`;
}

function flattenEventRows(work: CorpusWork): CorpusEventRow[] {
  return [...work.scenes]
    .sort((left, right) => left.sequence - right.sequence)
    .flatMap((scene) =>
      [...scene.eventRows].sort((left, right) => left.sequence - right.sequence)
    );
}

function summarizeTransition(input: {
  current: CorpusEventRow;
  next: CorpusEventRow;
  stateAxes: string[];
  worldRuleExceptionTokens: string[];
  preconditionTokens: string[];
}): string {
  const pieces = [`${input.current.eventType} -> ${input.next.eventType}`];

  if (input.stateAxes.length > 0) {
    pieces.push(`state axes: ${input.stateAxes.join(", ")}`);
  }

  if (input.worldRuleExceptionTokens.length > 0) {
    pieces.push(`rule exceptions: ${input.worldRuleExceptionTokens.join(", ")}`);
  }

  if (input.preconditionTokens.length > 0) {
    pieces.push(`preconditions: ${input.preconditionTokens.join(", ")}`);
  }

  return pieces.join(" | ");
}

export function normalizeCorpusTransition(input: {
  work: CorpusWork;
  current: CorpusEventRow;
  next: CorpusEventRow;
}): NormalizedCorpusTransition {
  const work = CorpusWorkSchema.parse(input.work);
  const current = input.current;
  const next = input.next;
  const stateAxes = uniqueSorted(next.stateTransitions.map((transition) => transition.axis));
  const stateTransitionTokens = uniqueSorted(
    next.stateTransitions.map((transition) => transitionToken(transition))
  );
  const worldRuleExceptionTokens = uniqueSorted([
    ...current.worldRuleExceptions.map((exception) => exception.token),
    ...next.worldRuleExceptions.map((exception) => exception.token)
  ]);
  const preconditionTokens = uniqueSorted(next.preconditionTokens);

  return NormalizedCorpusTransitionSchema.parse({
    workId: work.workId,
    title: work.title,
    genreWeights: work.genreWeights,
    genreKey: createGenreKey(work.genreWeights),
    worldProfile: work.worldProfile,
    currentEventId: current.eventId,
    currentEventType: current.eventType,
    nextEventId: next.eventId,
    nextEventType: next.eventType,
    stateAxes,
    stateTransitionTokens,
    worldRuleExceptionTokens,
    preconditionTokens,
    representativePatternSummary: summarizeTransition({
      current,
      next,
      stateAxes,
      worldRuleExceptionTokens,
      preconditionTokens
    })
  });
}

export function normalizeCorpusWork(work: CorpusWork): NormalizedCorpusWork {
  const parsed = CorpusWorkSchema.parse(work);
  const eventRows = flattenEventRows(parsed);
  const transitions: NormalizedCorpusTransition[] = [];

  for (let index = 0; index < eventRows.length - 1; index += 1) {
    const current = eventRows[index];
    const next = eventRows[index + 1];
    if (!current || !next) {
      continue;
    }

    transitions.push(normalizeCorpusTransition({ work: parsed, current, next }));
  }

  return NormalizedCorpusWorkSchema.parse({
    ...parsed,
    genreKey: createGenreKey(parsed.genreWeights),
    transitions
  });
}
