import { createHash } from "node:crypto";

import type { SupportingFinding, VerdictRecord } from "../domain/index.js";
import { VerdictRepository, VerdictRunRepository } from "../storage/index.js";

interface DiffAgainstPreviousRunInput {
  currentRunId: string;
  verdictRepository: VerdictRepository;
  verdictRunRepository: VerdictRunRepository;
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

export async function diffAgainstPreviousRun(input: DiffAgainstPreviousRunInput) {
  const currentRun = await input.verdictRunRepository.getRun(input.currentRunId);
  if (!currentRun) {
    throw new Error(`Verdict run not found: ${input.currentRunId}`);
  }

  const currentVerdicts = await input.verdictRepository.listForRun(currentRun.runId);
  if (!currentRun.previousRunId) {
    return {
      currentRunId: currentRun.runId,
      previousRunId: undefined,
      representativeVerdictChanged: false,
      addedFindingIds: currentVerdicts.flatMap((verdict) =>
        verdict.evidence.findingId ? [verdict.evidence.findingId] : []
      ),
      resolvedFindingIds: [],
      persistedFindingIds: [],
      changedSupportingFindings: []
    };
  }

  const previousVerdicts = await input.verdictRepository.listForRun(currentRun.previousRunId);
  const currentByFindingId = new Map(
    currentVerdicts.flatMap((verdict) =>
      verdict.evidence.findingId ? [[verdict.evidence.findingId, verdict] as const] : []
    )
  );
  const previousByFindingId = new Map(
    previousVerdicts.flatMap((verdict) =>
      verdict.evidence.findingId ? [[verdict.evidence.findingId, verdict] as const] : []
    )
  );

  const currentFindingIds = [...currentByFindingId.keys()];
  const previousFindingIds = [...previousByFindingId.keys()];
  const addedFindingIds = currentFindingIds.filter((findingId) => !previousByFindingId.has(findingId));
  const resolvedFindingIds = previousFindingIds.filter((findingId) => !currentByFindingId.has(findingId));
  const persistedFindingIds = currentFindingIds.filter((findingId) => previousByFindingId.has(findingId));
  const changedSupportingFindings = persistedFindingIds.filter((findingId) => {
    const current = currentByFindingId.get(findingId);
    const previous = previousByFindingId.get(findingId);
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

  const currentRepresentative = representativeVerdict(currentVerdicts);
  const previousRepresentative = representativeVerdict(previousVerdicts);
  const representativeVerdictChanged =
    currentRepresentative?.verdictKind !== previousRepresentative?.verdictKind ||
    currentRepresentative?.evidence.findingId !== previousRepresentative?.evidence.findingId;

  return {
    currentRunId: currentRun.runId,
    previousRunId: currentRun.previousRunId,
    representativeVerdictChanged,
    addedFindingIds,
    resolvedFindingIds,
    persistedFindingIds,
    changedSupportingFindings
  };
}
