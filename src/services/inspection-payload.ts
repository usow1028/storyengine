import {
  InspectionDiffSchema,
  RunInspectionResponseSchema,
  RunInspectionSnapshotSchema,
  VERDICT_KIND_ORDER,
  type InspectionAdvisory,
  type InspectionDiff,
  type InspectionRepairCandidate,
  type InspectionTimelineItem,
  type RepairCandidate,
  type RepairPlausibilityAdjustment,
  type RunInspectionResponse,
  type RunInspectionSnapshot
} from "../domain/index.js";
import type {
  EventEvidenceSummary,
  VerdictRecord,
  VerdictRunRecord
} from "../domain/index.js";
import type { VerdictRepository, VerdictRunRepository } from "../storage/index.js";
import { diffVerdictRuns, type VerdictDiffResult } from "./verdict-diff.js";
import type { SoftPriorAdvisoryResult } from "./soft-prior-runtime.js";

interface CreateRunInspectionSnapshotInput {
  runId: string;
  createdAt: string;
  repairs: RepairCandidate[];
  softPrior: SoftPriorAdvisoryResult;
}

interface BuildRunInspectionPayloadInput {
  runId: string;
  baseRunId?: string;
  baseRevisionId?: string;
  verdictRunRepository: VerdictRunRepository;
  verdictRepository: VerdictRepository;
}

function createInspectionAdvisory(softPrior: SoftPriorAdvisoryResult): InspectionAdvisory {
  if (softPrior.status === "available") {
    return {
      status: softPrior.status,
      assessment: softPrior.assessment,
      rerankedRepairs: softPrior.rerankedRepairs,
      repairPlausibilityAdjustments: softPrior.repairPlausibilityAdjustments
    };
  }

  return {
    status: softPrior.status,
    reason: softPrior.reason,
    assessment: null,
    rerankedRepairs: [],
    repairPlausibilityAdjustments: []
  };
}

export function createRunInspectionSnapshot(
  input: CreateRunInspectionSnapshotInput
): RunInspectionSnapshot {
  return RunInspectionSnapshotSchema.parse({
    runId: input.runId,
    createdAt: input.createdAt,
    repairCandidates: input.repairs,
    advisory: createInspectionAdvisory(input.softPrior)
  });
}

function missingInspectionSnapshotAdvisory(): InspectionAdvisory {
  return {
    status: "missing_snapshot",
    reason: "Inspection advisory snapshot is not stored for this run.",
    assessment: null,
    rerankedRepairs: [],
    repairPlausibilityAdjustments: []
  };
}

function serializeRun(run: VerdictRunRecord): RunInspectionResponse["run"] {
  return {
    runId: run.runId,
    storyId: run.storyId,
    revisionId: run.revisionId,
    previousRunId: run.previousRunId ?? null,
    triggerKind: run.triggerKind,
    createdAt: run.createdAt
  };
}

function normalizeDiff(diff: VerdictDiffResult): InspectionDiff {
  return InspectionDiffSchema.parse({
    ...diff,
    previousRunId: diff.previousRunId ?? null,
    currentScopeId: diff.currentScopeId ?? null,
    baseScopeId: diff.baseScopeId ?? null,
    currentComparisonScopeKey: diff.currentComparisonScopeKey ?? null,
    baseComparisonScopeKey: diff.baseComparisonScopeKey ?? null,
    findingChanges: diff.findingChanges
  });
}

function findingIdFor(verdict: VerdictRecord): string | undefined {
  return verdict.evidence.findingId;
}

function orderedRepairsForSnapshot(snapshot: RunInspectionSnapshot): RepairCandidate[] {
  if (
    snapshot.advisory.status === "available" &&
    snapshot.advisory.rerankedRepairs.length > 0
  ) {
    return snapshot.advisory.rerankedRepairs;
  }

  return snapshot.repairCandidates;
}

function repairsForVerdict(
  verdict: VerdictRecord,
  snapshot: RunInspectionSnapshot | undefined
): InspectionRepairCandidate[] {
  const findingId = findingIdFor(verdict);
  if (!findingId || !snapshot) {
    return [];
  }

  const adjustmentsByRepairId = new Map<string, RepairPlausibilityAdjustment>(
    snapshot.advisory.repairPlausibilityAdjustments.map((adjustment) => [
      adjustment.repairId,
      adjustment
    ])
  );

  return orderedRepairsForSnapshot(snapshot)
    .filter((repair) => repair.sourceFindingIds.includes(findingId))
    .map((repair) => ({
      ...repair,
      plausibilityAdjustment: adjustmentsByRepairId.get(repair.repairId) ?? null
    }));
}

function summarizeEvent(event: EventEvidenceSummary): string {
  return event.placeId ? `${event.eventType} at ${event.placeId}` : event.eventType;
}

function timelineForVerdict(verdict: VerdictRecord): InspectionTimelineItem[] {
  const evidence = verdict.evidence;

  return [...evidence.eventSummaries]
    .sort((left, right) => left.sequence - right.sequence || left.eventId.localeCompare(right.eventId))
    .map((event) => ({
      eventId: event.eventId,
      sequence: event.sequence,
      eventType: event.eventType,
      summary: summarizeEvent(event),
      abstract: event.abstract,
      actorIds: event.actorIds,
      targetIds: event.targetIds,
      placeId: event.placeId ?? null,
      timeRelation: event.timeRelation,
      relatedStateBoundaryIds: evidence.stateBoundaryIds,
      relatedRuleVersionIds: evidence.ruleVersionIds,
      conflictPath: evidence.conflictPath
    }));
}

function buildVerdictSummary(
  verdict: VerdictRecord,
  repairs: RepairCandidate[]
): RunInspectionResponse["groups"][number]["verdicts"][number] {
  const findingId = verdict.evidence.findingId ?? null;

  return {
    verdictId: verdict.verdictId,
    verdictKind: verdict.verdictKind,
    category: verdict.category,
    explanation: verdict.explanation,
    findingId,
    reasonCode: verdict.evidence.reasonCode ?? null,
    relatedEventIds: verdict.evidence.eventIds,
    eventCount: verdict.evidence.eventIds.length,
    repairCandidateCount: findingId
      ? repairs.filter((repair) => repair.sourceFindingIds.includes(findingId)).length
      : 0,
    createdAt: verdict.createdAt
  };
}

function buildVerdictDetail(input: {
  verdict: VerdictRecord;
  snapshot: RunInspectionSnapshot | undefined;
  advisory: InspectionAdvisory;
  diff: InspectionDiff;
}): RunInspectionResponse["detailsByVerdictId"][string] {
  const { verdict } = input;
  const evidence = verdict.evidence;
  const repairs = repairsForVerdict(verdict, input.snapshot);

  return {
    verdictId: verdict.verdictId,
    verdictKind: verdict.verdictKind,
    category: verdict.category,
    explanation: verdict.explanation,
    deterministicVerdict: {
      verdictId: verdict.verdictId,
      verdictKind: verdict.verdictKind,
      category: verdict.category,
      explanation: verdict.explanation,
      findingId: evidence.findingId ?? null,
      representativeChecker: evidence.representativeChecker ?? null,
      reasonCode: evidence.reasonCode ?? null,
      createdAt: verdict.createdAt
    },
    evidenceSummary: {
      summary: verdict.explanation,
      eventCount: evidence.eventIds.length,
      stateCount: evidence.stateBoundaryIds.length,
      ruleCount: evidence.ruleVersionIds.length,
      missingPremiseCount: evidence.missingPremises.length,
      supportingFindingCount: evidence.supportingFindings.length,
      relatedEventIds: evidence.eventIds
    },
    trace: {
      findingId: evidence.findingId ?? null,
      representativeChecker: evidence.representativeChecker ?? null,
      reasonCode: evidence.reasonCode ?? null,
      eventIds: evidence.eventIds,
      stateBoundaryIds: evidence.stateBoundaryIds,
      ruleVersionIds: evidence.ruleVersionIds,
      provenanceIds: evidence.provenanceIds,
      conflictPath: evidence.conflictPath,
      missingPremises: evidence.missingPremises,
      supportingFindings: evidence.supportingFindings,
      notEvaluated: evidence.notEvaluated
    },
    timeline: timelineForVerdict(verdict),
    eventSummaries: evidence.eventSummaries,
    stateSummaries: evidence.stateSummaries,
    ruleSummaries: evidence.ruleSummaries,
    repairs,
    advisory: input.advisory,
    diff: input.diff,
    createdAt: verdict.createdAt
  };
}

export async function buildRunInspectionPayload(
  input: BuildRunInspectionPayloadInput
): Promise<RunInspectionResponse | undefined> {
  const run = await input.verdictRunRepository.getRun(input.runId);
  if (!run) {
    return undefined;
  }

  const verdicts = await input.verdictRepository.listForRun(run.runId);
  const snapshot = await input.verdictRunRepository.getInspectionSnapshot(run.runId);
  const advisory = snapshot?.advisory ?? missingInspectionSnapshotAdvisory();
  const diff = normalizeDiff(
    await diffVerdictRuns({
      currentRunId: run.runId,
      baseRunId: input.baseRunId,
      baseRevisionId: input.baseRevisionId,
      verdictRepository: input.verdictRepository,
      verdictRunRepository: input.verdictRunRepository
    })
  );
  const repairs = snapshot ? orderedRepairsForSnapshot(snapshot) : [];

  const groups = VERDICT_KIND_ORDER.map((verdictKind) => {
    const groupedVerdicts = verdicts.filter((verdict) => verdict.verdictKind === verdictKind);
    return {
      verdictKind,
      count: groupedVerdicts.length,
      verdicts: groupedVerdicts.map((verdict) => buildVerdictSummary(verdict, repairs))
    };
  });

  const selectedVerdictId =
    groups.find((group) => group.verdicts.length > 0)?.verdicts[0].verdictId ?? null;
  const detailsByVerdictId = Object.fromEntries(
    verdicts.map((verdict) => [
      verdict.verdictId,
      buildVerdictDetail({
        verdict,
        snapshot,
        advisory,
        diff
      })
    ])
  );

  return RunInspectionResponseSchema.parse({
    run: serializeRun(run),
    groups,
    selectedVerdictId,
    detailsByVerdictId,
    diff
  });
}
