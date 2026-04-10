import { createHash } from "node:crypto";

import type { VerdictKind, VerdictRecord } from "../domain/index.js";
import {
  evaluateRevision,
  generateRepairCandidates,
  type ActiveRuleSnapshot,
  type CharacterBoundaryFacts,
  type RepairSource
} from "../engine/index.js";
import {
  RuleRepository,
  StoryRepository,
  VerdictRepository,
  VerdictRunRepository,
  type CanonicalStoryGraph
} from "../storage/index.js";
import { buildExplainedVerdictRecord } from "./explained-verdicts.js";
import {
  evaluateConfiguredSoftPrior,
  type SoftPriorAdvisoryResult,
  type SoftPriorRuntimeConfig
} from "./soft-prior-runtime.js";
import { createRunInspectionSnapshot } from "./inspection-payload.js";

export interface ExecuteVerdictRunInput {
  storyId: string;
  revisionId: string;
  storyRepository: StoryRepository;
  ruleRepository: RuleRepository;
  verdictRepository: VerdictRepository;
  verdictRunRepository: VerdictRunRepository;
  triggerKind?: "manual" | "rerun" | "test" | "system";
  boundaryFactsByEventId?: Record<string, Record<string, CharacterBoundaryFacts>>;
  createdAt?: string;
  softPriorConfig?: SoftPriorRuntimeConfig;
}

export interface ExecuteVerdictRunResult {
  runId: string;
  previousRunId?: string;
  verdicts: VerdictRecord[];
  softPrior: SoftPriorAdvisoryResult;
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

function buildRepairSources(verdicts: VerdictRecord[]): RepairSource[] {
  return verdicts.flatMap((verdict) => {
    const findingId = verdict.evidence.findingId;
    const reasonCode = verdict.evidence.reasonCode;
    if (!findingId || !reasonCode) {
      return [];
    }

    return [
      {
        sourceFindingId: findingId,
        reasonCode,
        category: verdict.category,
        verdictKind: verdict.verdictKind,
        evidence: verdict.evidence
      }
    ];
  });
}

function selectHardVerdictKind(verdicts: VerdictRecord[]): VerdictKind {
  const priority: VerdictKind[] = [
    "Hard Contradiction",
    "Repairable Gap",
    "Soft Drift",
    "Consistent"
  ];

  return priority.find((kind) => verdicts.some((verdict) => verdict.verdictKind === kind)) ?? "Consistent";
}

export async function executeVerdictRun(
  input: ExecuteVerdictRunInput
): Promise<ExecuteVerdictRunResult> {
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
  const repairs = generateRepairCandidates({ sources: buildRepairSources(verdicts) });
  const softPrior = await evaluateConfiguredSoftPrior({
    graph,
    repairs,
    softPriorConfig: input.softPriorConfig,
    hardVerdictKind: selectHardVerdictKind(verdicts)
  });
  await input.verdictRunRepository.saveInspectionSnapshot(
    runId,
    createRunInspectionSnapshot({
      runId,
      createdAt,
      repairs,
      softPrior
    })
  );

  return {
    runId,
    previousRunId: previousRun?.runId,
    verdicts,
    softPrior
  };
}
