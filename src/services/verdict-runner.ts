import { createHash } from "node:crypto";

import type { VerdictRecord } from "../domain/index.js";
import { evaluateRevision, type ActiveRuleSnapshot, type CharacterBoundaryFacts } from "../engine/index.js";
import {
  RuleRepository,
  StoryRepository,
  VerdictRepository,
  VerdictRunRepository,
  type CanonicalStoryGraph
} from "../storage/index.js";
import { buildExplainedVerdictRecord } from "./explained-verdicts.js";

interface ExecuteVerdictRunInput {
  storyId: string;
  revisionId: string;
  storyRepository: StoryRepository;
  ruleRepository: RuleRepository;
  verdictRepository: VerdictRepository;
  verdictRunRepository: VerdictRunRepository;
  triggerKind?: "manual" | "rerun" | "test" | "system";
  boundaryFactsByEventId?: Record<string, Record<string, CharacterBoundaryFacts>>;
  createdAt?: string;
}

function orderedEvents(graph: CanonicalStoryGraph) {
  return [...graph.events].sort((left, right) => left.sequence - right.sequence);
}

function createFindingId(verdict: VerdictRecord): string {
  const fingerprint = JSON.stringify({
    checker: verdict.evidence.representativeChecker,
    reasonCode: verdict.evidence.reasonCode,
    category: verdict.category,
    eventIds: verdict.evidence.eventIds,
    stateBoundaryIds: verdict.evidence.stateBoundaryIds,
    ruleVersionIds: verdict.evidence.ruleVersionIds,
    conflictPath: verdict.evidence.conflictPath,
    missingPremises: verdict.evidence.missingPremises
  });

  return `finding:${createHash("sha1").update(fingerprint).digest("hex").slice(0, 16)}`;
}

function createRunId(input: ExecuteVerdictRunInput, createdAt: string): string {
  return `run:${input.revisionId}:${createdAt}`;
}

export async function executeVerdictRun(input: ExecuteVerdictRunInput) {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const graph = await input.storyRepository.loadGraph(input.storyId, input.revisionId);
  const availableRules: ActiveRuleSnapshot[] = await input.ruleRepository.listRuleVersionsForRevision(
    input.storyId,
    input.revisionId
  );
  const previousRun = await input.verdictRunRepository.getLatestRunForRevision(
    input.storyId,
    input.revisionId
  );
  const runId = createRunId(input, createdAt);

  await input.verdictRunRepository.saveRun({
    runId,
    storyId: input.storyId,
    revisionId: input.revisionId,
    previousRunId: previousRun?.runId,
    triggerKind: input.triggerKind ?? "manual",
    createdAt
  });

  const evaluations = await evaluateRevision({
    graph,
    availableRules,
    boundaryFactsByEventId: input.boundaryFactsByEventId
  });
  const events = orderedEvents(graph);
  const verdicts = evaluations.map((evaluation, index) => {
    const event = events[index];
    if (!event) {
      throw new Error("Evaluation/event alignment failed.");
    }

    const verdict = buildExplainedVerdictRecord({
      graph,
      eventId: event.eventId,
      evaluation,
      availableRules,
      boundaryFactsByCharacterId: input.boundaryFactsByEventId?.[event.eventId],
      verdictId: `verdict:${runId}:${event.eventId}`,
      runId,
      createdAt
    });

    return {
      ...verdict,
      evidence: {
        ...verdict.evidence,
        findingId: createFindingId(verdict)
      }
    } satisfies VerdictRecord;
  });

  await input.verdictRepository.saveMany(verdicts);

  return {
    runId,
    previousRunId: previousRun?.runId,
    verdicts
  };
}
