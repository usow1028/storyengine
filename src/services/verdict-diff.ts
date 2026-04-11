import { createHash } from "node:crypto";

import type {
  SupportingFinding,
  VerdictKind,
  VerdictRecord,
  VerdictRunRecord
} from "../domain/index.js";
import { VerdictRepository, VerdictRunRepository } from "../storage/index.js";

export interface DiffVerdictRunsInput {
  currentRunId: string;
  baseRunId?: string;
  baseRevisionId?: string;
  verdictRepository: VerdictRepository;
  verdictRunRepository: VerdictRunRepository;
}

interface DiffAgainstPreviousRunInput {
  currentRunId: string;
  verdictRepository: VerdictRepository;
  verdictRunRepository: VerdictRunRepository;
}

export interface VerdictDiffFindingChange {
  changeKind: "added" | "resolved" | "persisted" | "changed_supporting";
  findingId: string;
  verdictKind: VerdictKind;
  scopeId: string | null;
  comparisonScopeKey: string | null;
  representativeChecker: string | null;
  reasonCode: string | null;
  eventIds: string[];
  stateBoundaryIds: string[];
  ruleVersionIds: string[];
  provenanceIds: string[];
}

export interface VerdictDiffResult {
  currentRunId: string;
  previousRunId: string | undefined;
  currentScopeId: string | null;
  baseScopeId: string | null;
  currentComparisonScopeKey: string | null;
  baseComparisonScopeKey: string | null;
  representativeVerdictChanged: boolean;
  addedFindingIds: string[];
  resolvedFindingIds: string[];
  persistedFindingIds: string[];
  changedSupportingFindings: string[];
  findingChanges: VerdictDiffFindingChange[];
}

function severity(verdict: VerdictRecord): number {
  switch (verdict.verdictKind) {
    case "Hard Contradiction":
      return 4;
    case "Repairable Gap":
      return 3;
    case "Soft Drift":
      return 2;
    case "Consistent":
      return 1;
  }
}

function representativeVerdict(verdicts: VerdictRecord[]): VerdictRecord | undefined {
  return [...verdicts].sort((left, right) => severity(right) - severity(left))[0];
}

function fingerprintSupportingFinding(finding: SupportingFinding): string {
  return createHash("sha1")
    .update(
      JSON.stringify({
        checker: finding.checker,
        reasonCode: finding.reasonCode,
        category: finding.category,
        eventIds: finding.evidence.eventIds,
        stateBoundaryIds: finding.evidence.stateBoundaryIds,
        ruleVersionIds: finding.evidence.ruleVersionIds
      })
    )
    .digest("hex");
}

function comparisonScopeKeyFor(run: VerdictRunRecord): string | undefined {
  return run.scope?.comparisonScopeKey;
}

function scopeIdFor(run: VerdictRunRecord): string | null {
  return run.scope?.scopeId ?? null;
}

function toFindingChange(
  changeKind: VerdictDiffFindingChange["changeKind"],
  verdict: VerdictRecord,
  run: VerdictRunRecord
): VerdictDiffFindingChange {
  return {
    changeKind,
    findingId: verdict.evidence.findingId ?? "",
    verdictKind: verdict.verdictKind,
    scopeId: scopeIdFor(run),
    comparisonScopeKey: comparisonScopeKeyFor(run) ?? null,
    representativeChecker: verdict.evidence.representativeChecker ?? null,
    reasonCode: verdict.evidence.reasonCode ?? null,
    eventIds: verdict.evidence.eventIds,
    stateBoundaryIds: verdict.evidence.stateBoundaryIds,
    ruleVersionIds: verdict.evidence.ruleVersionIds,
    provenanceIds: verdict.evidence.provenanceIds
  };
}

function assertComparableRuns(currentRun: VerdictRunRecord, baseRun: VerdictRunRecord): void {
  if (currentRun.storyId !== baseRun.storyId) {
    throw new Error(
      `Explicit base run ${baseRun.runId} belongs to story ${baseRun.storyId}, not ${currentRun.storyId}.`
    );
  }

  const currentKey = comparisonScopeKeyFor(currentRun) ?? null;
  const baseKey = comparisonScopeKeyFor(baseRun) ?? null;
  if (currentKey !== baseKey) {
    throw new Error(
      `Explicit base run ${baseRun.runId} is not comparable to run ${currentRun.runId} because comparisonScopeKey does not match.`
    );
  }
}

async function resolveBaseRun(
  input: DiffVerdictRunsInput,
  currentRun: VerdictRunRecord
): Promise<VerdictRunRecord | undefined> {
  if (input.baseRunId) {
    const explicitBaseRun = await input.verdictRunRepository.getRun(input.baseRunId);
    if (!explicitBaseRun) {
      throw new Error(`Explicit baseRunId not found: ${input.baseRunId}`);
    }

    assertComparableRuns(currentRun, explicitBaseRun);
    return explicitBaseRun;
  }

  if (input.baseRevisionId) {
    const comparisonScopeKey = comparisonScopeKeyFor(currentRun);
    if (!comparisonScopeKey) {
      throw new Error(
        `Explicit baseRevisionId ${input.baseRevisionId} requires a comparisonScopeKey on current run ${currentRun.runId}.`
      );
    }

    const comparableRun = await input.verdictRunRepository.getLatestComparableRun(
      currentRun.storyId,
      input.baseRevisionId,
      comparisonScopeKey
    );
    if (!comparableRun) {
      throw new Error(
        `No comparable verdict run found for revision ${input.baseRevisionId} with comparisonScopeKey ${comparisonScopeKey}.`
      );
    }

    return comparableRun;
  }

  if (!currentRun.previousRunId) {
    return undefined;
  }

  const previousRun = await input.verdictRunRepository.getRun(currentRun.previousRunId);
  if (!previousRun) {
    throw new Error(`Verdict run not found: ${currentRun.previousRunId}`);
  }

  return previousRun;
}

function mapVerdictsByFindingId(verdicts: VerdictRecord[]): Map<string, VerdictRecord> {
  return new Map(
    verdicts.flatMap((verdict) =>
      verdict.evidence.findingId ? [[verdict.evidence.findingId, verdict] as const] : []
    )
  );
}

export async function diffVerdictRuns(input: DiffVerdictRunsInput): Promise<VerdictDiffResult> {
  const currentRun = await input.verdictRunRepository.getRun(input.currentRunId);
  if (!currentRun) {
    throw new Error(`Verdict run not found: ${input.currentRunId}`);
  }

  const currentVerdicts = await input.verdictRepository.listForRun(currentRun.runId);
  const baseRun = await resolveBaseRun(input, currentRun);
  if (!baseRun) {
    const addedFindingIds = currentVerdicts
      .flatMap((verdict) => (verdict.evidence.findingId ? [verdict.evidence.findingId] : []))
      .sort();

    return {
      currentRunId: currentRun.runId,
      previousRunId: undefined,
      currentScopeId: scopeIdFor(currentRun),
      baseScopeId: null,
      currentComparisonScopeKey: comparisonScopeKeyFor(currentRun) ?? null,
      baseComparisonScopeKey: null,
      representativeVerdictChanged: false,
      addedFindingIds,
      resolvedFindingIds: [],
      persistedFindingIds: [],
      changedSupportingFindings: [],
      findingChanges: currentVerdicts
        .filter((verdict) => verdict.evidence.findingId)
        .map((verdict) => toFindingChange("added", verdict, currentRun))
    };
  }

  const baseVerdicts = await input.verdictRepository.listForRun(baseRun.runId);
  const currentByFindingId = mapVerdictsByFindingId(currentVerdicts);
  const baseByFindingId = mapVerdictsByFindingId(baseVerdicts);

  const currentFindingIds = [...currentByFindingId.keys()].sort();
  const baseFindingIds = [...baseByFindingId.keys()].sort();
  const addedFindingIds = currentFindingIds.filter((findingId) => !baseByFindingId.has(findingId));
  const resolvedFindingIds = baseFindingIds.filter((findingId) => !currentByFindingId.has(findingId));
  const persistedFindingIds = currentFindingIds.filter((findingId) => baseByFindingId.has(findingId));
  const changedSupportingFindings = persistedFindingIds.filter((findingId) => {
    const current = currentByFindingId.get(findingId);
    const previous = baseByFindingId.get(findingId);
    if (!current || !previous) {
      return false;
    }

    const currentSupporting = current.evidence.supportingFindings
      .map((finding) => fingerprintSupportingFinding(finding))
      .sort();
    const previousSupporting = previous.evidence.supportingFindings
      .map((finding) => fingerprintSupportingFinding(finding))
      .sort();

    return JSON.stringify(currentSupporting) !== JSON.stringify(previousSupporting);
  });

  const findingChanges: VerdictDiffFindingChange[] = [
    ...addedFindingIds.map((findingId) =>
      toFindingChange("added", currentByFindingId.get(findingId) as VerdictRecord, currentRun)
    ),
    ...resolvedFindingIds.map((findingId) =>
      toFindingChange("resolved", baseByFindingId.get(findingId) as VerdictRecord, baseRun)
    ),
    ...persistedFindingIds.map((findingId) =>
      toFindingChange("persisted", currentByFindingId.get(findingId) as VerdictRecord, currentRun)
    ),
    ...changedSupportingFindings.map((findingId) =>
      toFindingChange(
        "changed_supporting",
        currentByFindingId.get(findingId) as VerdictRecord,
        currentRun
      )
    )
  ];

  const currentRepresentative = representativeVerdict(currentVerdicts);
  const previousRepresentative = representativeVerdict(baseVerdicts);
  const representativeVerdictChanged =
    currentRepresentative?.verdictKind !== previousRepresentative?.verdictKind ||
    currentRepresentative?.evidence.findingId !== previousRepresentative?.evidence.findingId;

  return {
    currentRunId: currentRun.runId,
    previousRunId: baseRun.runId,
    currentScopeId: scopeIdFor(currentRun),
    baseScopeId: scopeIdFor(baseRun),
    currentComparisonScopeKey: comparisonScopeKeyFor(currentRun) ?? null,
    baseComparisonScopeKey: comparisonScopeKeyFor(baseRun) ?? null,
    representativeVerdictChanged,
    addedFindingIds,
    resolvedFindingIds,
    persistedFindingIds,
    changedSupportingFindings,
    findingChanges
  };
}

export async function diffAgainstPreviousRun(
  input: DiffAgainstPreviousRunInput
): Promise<VerdictDiffResult> {
  return diffVerdictRuns(input);
}
