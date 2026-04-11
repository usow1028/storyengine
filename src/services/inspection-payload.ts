import {
  InspectionDiffSchema,
  InspectionProvenanceSummarySchema,
  InspectionScopeSummarySchema,
  InspectionSecondaryGroupSchema,
  InspectionSourceContextSchema,
  RunInspectionResponseSchema,
  RunInspectionSnapshotSchema,
  VERDICT_KIND_ORDER,
  type DraftSourceTextRef,
  type EventEvidenceSummary,
  type InspectionAdvisory,
  type InspectionDiff,
  type InspectionOperationalSummary,
  type InspectionRepairCandidate,
  type InspectionReviewState,
  type InspectionTimelineItem,
  type RepairCandidate,
  type RepairPlausibilityAdjustment,
  type RunInspectionResponse,
  type RunInspectionSnapshot,
  type VerdictRecord,
  type VerdictRunRecord
} from "../domain/index.js";
import type { IngestionSessionSnapshot } from "../domain/index.js";
import type {
  IngestionSessionRepository,
  ProvenanceRecord,
  ProvenanceRepository,
  VerdictRepository,
  VerdictRunRepository
} from "../storage/index.js";
import { diffVerdictRuns, type VerdictDiffResult } from "./verdict-diff.js";
import type { SoftPriorAdvisoryResult } from "./soft-prior-runtime.js";

interface CreateRunInspectionSnapshotInput {
  runId: string;
  createdAt: string;
  repairs: RepairCandidate[];
  softPrior: SoftPriorAdvisoryResult;
  operationalSummary?: InspectionOperationalSummary | null;
}

interface BuildRunInspectionPayloadInput {
  runId: string;
  baseRunId?: string;
  baseRevisionId?: string;
  verdictRunRepository: VerdictRunRepository;
  verdictRepository: VerdictRepository;
  ingestionSessionRepository?: IngestionSessionRepository;
  provenanceRepository?: ProvenanceRepository;
}

interface ResolvedVerdictContext {
  secondaryGroup: RunInspectionResponse["groups"][number]["verdicts"][number]["secondaryGroup"];
  provenanceSummary: RunInspectionResponse["groups"][number]["verdicts"][number]["provenanceSummary"];
  sourceContext: RunInspectionResponse["detailsByVerdictId"][string]["sourceContext"];
}

interface ResolvedProvenanceEntry {
  record: ProvenanceRecord;
  sessionId: string | null;
  segmentId: string | null;
  sourceSpan: DraftSourceTextRef | null;
  snapshot?: IngestionSessionSnapshot;
  segment?: IngestionSessionSnapshot["segments"][number];
  section?: IngestionSessionSnapshot["draftSections"][number];
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
    advisory: createInspectionAdvisory(input.softPrior),
    operationalSummary: input.operationalSummary ?? null
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

function scopeSummaryForRun(
  run: VerdictRunRecord
): RunInspectionResponse["run"]["scopeSummary"] {
  if (!run.scope) {
    return null;
  }

  return InspectionScopeSummarySchema.parse({
    scopeId: run.scope.scopeId,
    scopeKind: run.scope.scopeKind,
    comparisonScopeKey: run.scope.comparisonScopeKey,
    documentId: run.scope.payload.documentId,
    draftRevisionId: run.scope.payload.draftRevisionId,
    segmentCount: run.scope.segmentIds.length,
    eventCount: run.scope.eventIds.length,
    sourceTextRefCount: run.scope.sourceTextRefs.length
  });
}

function serializeRun(
  run: VerdictRunRecord,
  snapshot: RunInspectionSnapshot | undefined
): RunInspectionResponse["run"] {
  return {
    runId: run.runId,
    storyId: run.storyId,
    revisionId: run.revisionId,
    previousRunId: run.previousRunId ?? null,
    triggerKind: run.triggerKind,
    createdAt: run.createdAt,
    scopeSummary: scopeSummaryForRun(run),
    operationalSummary: snapshot?.operationalSummary ?? null
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

function parseString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function parseNonNegativeInteger(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

function sourceSpanFromDetail(detail: Record<string, unknown>): DraftSourceTextRef | null {
  const sessionId = parseString(detail.sessionId);
  const startOffset = parseNonNegativeInteger(detail.sourceSpanStart);
  const endOffset = parseNonNegativeInteger(detail.sourceSpanEnd);

  if (!sessionId || startOffset === null || endOffset === null || startOffset > endOffset) {
    return null;
  }

  return {
    sourceKind: "ingestion_session_raw_text",
    sessionId,
    startOffset,
    endOffset,
    textNormalization: "lf"
  };
}

function reviewStateForSegment(
  segmentSnapshot: IngestionSessionSnapshot["segments"][number] | undefined
): InspectionReviewState | null {
  if (!segmentSnapshot) {
    return null;
  }

  return segmentSnapshot.segment.stale ? "stale" : segmentSnapshot.segment.workflowState;
}

function slugifyLabel(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function dedupeSourceSpans(sourceSpans: DraftSourceTextRef[]): DraftSourceTextRef[] {
  const unique = new Map<string, DraftSourceTextRef>();
  for (const sourceSpan of sourceSpans) {
    unique.set(JSON.stringify(sourceSpan), sourceSpan);
  }

  return [...unique.values()];
}

async function loadSessionSnapshotSafe(
  repository: IngestionSessionRepository,
  sessionId: string
): Promise<IngestionSessionSnapshot | undefined> {
  try {
    return await repository.loadSessionSnapshot(sessionId);
  } catch {
    return undefined;
  }
}

function secondaryGroupFromEntry(
  entry: ResolvedProvenanceEntry,
  run: VerdictRunRecord
): ResolvedVerdictContext["secondaryGroup"] {
  if (!entry.section) {
    return null;
  }

  const documentId =
    entry.snapshot?.session.draft?.document.documentId ??
    entry.segment?.segment.draftPath?.documentId ??
    run.scope?.payload.documentId ??
    null;

  if (!documentId) {
    return null;
  }

  return InspectionSecondaryGroupSchema.parse({
    groupKey: `${entry.section.sectionKind}:${documentId}:${slugifyLabel(entry.section.label)}`,
    label: entry.section.label,
    kind: entry.section.sectionKind,
    sectionId: entry.section.sectionId,
    documentId
  });
}

function provenanceSummaryFromEntry(
  entry: ResolvedProvenanceEntry,
  sourceSpans: DraftSourceTextRef[]
): ResolvedVerdictContext["provenanceSummary"] {
  return InspectionProvenanceSummarySchema.parse({
    provenanceId: entry.record.provenanceId,
    sessionId: entry.sessionId,
    segmentId: entry.segmentId,
    segmentLabel: entry.segment?.segment.label ?? null,
    reviewState: reviewStateForSegment(entry.segment),
    sectionId: entry.section?.sectionId ?? null,
    sectionLabel: entry.section?.label ?? null,
    sectionKind: entry.section?.sectionKind ?? null,
    sourceSpans
  });
}

function sourceContextFromEntry(
  entry: ResolvedProvenanceEntry,
  provenanceIds: string[],
  sourceSpans: DraftSourceTextRef[]
): ResolvedVerdictContext["sourceContext"] {
  return InspectionSourceContextSchema.parse({
    provenanceIds,
    sessionId: entry.sessionId,
    segmentId: entry.segmentId,
    segmentLabel: entry.segment?.segment.label ?? null,
    reviewState: reviewStateForSegment(entry.segment),
    sectionId: entry.section?.sectionId ?? null,
    sectionLabel: entry.section?.label ?? null,
    sectionKind: entry.section?.sectionKind ?? null,
    sourceSpans
  });
}

async function resolveVerdictContext(
  verdict: VerdictRecord,
  run: VerdictRunRecord,
  repositories: Pick<
    BuildRunInspectionPayloadInput,
    "ingestionSessionRepository" | "provenanceRepository"
  >
): Promise<ResolvedVerdictContext> {
  if (
    !repositories.ingestionSessionRepository ||
    !repositories.provenanceRepository ||
    verdict.evidence.provenanceIds.length === 0
  ) {
    return {
      secondaryGroup: null,
      provenanceSummary: null,
      sourceContext: null
    };
  }

  const ingestionSessionRepository = repositories.ingestionSessionRepository;
  const provenanceRepository = repositories.provenanceRepository;

  const sessionSnapshotCache = new Map<string, Promise<IngestionSessionSnapshot | undefined>>();
  const loadSessionSnapshot = (sessionId: string) => {
    const cached = sessionSnapshotCache.get(sessionId);
    if (cached) {
      return cached;
    }

    const promise = loadSessionSnapshotSafe(ingestionSessionRepository, sessionId);
    sessionSnapshotCache.set(sessionId, promise);
    return promise;
  };

  const records = await provenanceRepository.getByIds(verdict.evidence.provenanceIds);
  const entries = await Promise.all(
    records.map(async (record) => {
      const sessionId = parseString(record.detail.sessionId);
      const segmentId = parseString(record.detail.segmentId);
      const sourceSpan = sourceSpanFromDetail(record.detail);
      const snapshot = sessionId ? await loadSessionSnapshot(sessionId) : undefined;
      const segment = segmentId
        ? snapshot?.segments.find((entry) => entry.segment.segmentId === segmentId)
        : undefined;
      const section = segment?.segment.sectionId
        ? snapshot?.draftSections.find((entry) => entry.sectionId === segment.segment.sectionId)
        : undefined;

      return {
        record,
        sessionId,
        segmentId,
        sourceSpan,
        snapshot,
        segment,
        section
      } satisfies ResolvedProvenanceEntry;
    })
  );

  if (entries.length === 0) {
    return {
      secondaryGroup: null,
      provenanceSummary: null,
      sourceContext: null
    };
  }

  const primaryEntry =
    entries.find((entry) => entry.segment || entry.sourceSpan) ??
    entries[0];
  const sourceSpans = dedupeSourceSpans(
    entries.flatMap((entry) => {
      if (entry.sourceSpan) {
        return [entry.sourceSpan];
      }

      const segmentSourceTextRef = entry.segment?.segment.sourceTextRef;
      return segmentSourceTextRef ? [segmentSourceTextRef] : [];
    })
  );

  return {
    secondaryGroup: secondaryGroupFromEntry(primaryEntry, run),
    provenanceSummary: provenanceSummaryFromEntry(primaryEntry, sourceSpans),
    sourceContext: sourceContextFromEntry(
      primaryEntry,
      verdict.evidence.provenanceIds,
      sourceSpans
    )
  };
}

function buildVerdictSummary(
  verdict: VerdictRecord,
  repairs: RepairCandidate[],
  resolvedContext: ResolvedVerdictContext
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
    createdAt: verdict.createdAt,
    secondaryGroup: resolvedContext.secondaryGroup,
    provenanceSummary: resolvedContext.provenanceSummary
  };
}

function buildVerdictDetail(input: {
  verdict: VerdictRecord;
  snapshot: RunInspectionSnapshot | undefined;
  advisory: InspectionAdvisory;
  diff: InspectionDiff;
  resolvedContext: ResolvedVerdictContext;
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
    sourceContext: input.resolvedContext.sourceContext,
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
  const verdictContexts = new Map<string, ResolvedVerdictContext>(
    await Promise.all(
      verdicts.map(async (verdict) => [
        verdict.verdictId,
        await resolveVerdictContext(verdict, run, input)
      ] as const)
    )
  );

  const groups = VERDICT_KIND_ORDER.map((verdictKind) => {
    const groupedVerdicts = verdicts.filter((verdict) => verdict.verdictKind === verdictKind);
    return {
      verdictKind,
      count: groupedVerdicts.length,
      verdicts: groupedVerdicts.map((verdict) =>
        buildVerdictSummary(
          verdict,
          repairs,
          verdictContexts.get(verdict.verdictId) ?? {
            secondaryGroup: null,
            provenanceSummary: null,
            sourceContext: null
          }
        )
      )
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
        diff,
        resolvedContext: verdictContexts.get(verdict.verdictId) ?? {
          secondaryGroup: null,
          provenanceSummary: null,
          sourceContext: null
        }
      })
    ])
  );

  return RunInspectionResponseSchema.parse({
    run: serializeRun(run, snapshot),
    groups,
    selectedVerdictId,
    detailsByVerdictId,
    diff
  });
}
