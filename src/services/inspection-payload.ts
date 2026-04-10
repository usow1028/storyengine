import {
  RunInspectionSnapshotSchema,
  type InspectionAdvisory,
  type RepairCandidate,
  type RunInspectionSnapshot
} from "../domain/index.js";
import type { SoftPriorAdvisoryResult } from "./soft-prior-runtime.js";

interface CreateRunInspectionSnapshotInput {
  runId: string;
  createdAt: string;
  repairs: RepairCandidate[];
  softPrior: SoftPriorAdvisoryResult;
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
