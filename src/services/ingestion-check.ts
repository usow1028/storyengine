import { IngestionWorkflowStateSchema } from "../domain/index.js";
import {
  IngestionSessionRepository,
  RuleRepository,
  StoryRepository,
  VerdictRepository,
  VerdictRunRepository
} from "../storage/index.js";
import { executeVerdictRun } from "./verdict-runner.js";
import { IngestionConflictError } from "./ingestion-review.js";
import type {
  SoftPriorAdvisoryResult,
  SoftPriorRuntimeConfig
} from "./soft-prior-runtime.js";

interface ExecuteIngestionCheckDependencies {
  ingestionSessionRepository: IngestionSessionRepository;
  storyRepository: StoryRepository;
  ruleRepository: RuleRepository;
  verdictRepository: VerdictRepository;
  verdictRunRepository: VerdictRunRepository;
  softPriorConfig?: SoftPriorRuntimeConfig;
  now?: () => string;
}

function defaultNow(): string {
  return new Date().toISOString();
}

export async function executeIngestionCheck(
  sessionId: string,
  dependencies: ExecuteIngestionCheckDependencies
): Promise<{
  sessionId: string;
  workflowState: "checked";
  storyId: string;
  revisionId: string;
  runId: string;
  previousRunId: string | null;
  softPrior: SoftPriorAdvisoryResult;
}> {
  const snapshot = await dependencies.ingestionSessionRepository.loadSessionSnapshot(sessionId);
  const workflowState = IngestionWorkflowStateSchema.parse(snapshot.session.workflowState);

  if (
    !snapshot.segments.every(
      ({ segment }) =>
        segment.workflowState === "approved" &&
        segment.approvedAt !== null &&
        segment.stale === false
    )
  ) {
    throw new IngestionConflictError(
      `Session ${sessionId} must have every segment approved and current before a manual check can run.`
    );
  }

  if (workflowState !== "approved") {
    throw new IngestionConflictError(
      `Session ${sessionId} must be approved before a manual check can run.`
    );
  }

  if (!snapshot.session.storyId || !snapshot.session.revisionId) {
    throw new IngestionConflictError(
      `Session ${sessionId} does not have a canonical story target for manual checks.`
    );
  }

  const createdAt = (dependencies.now ?? defaultNow)();
  const verdictRun = await executeVerdictRun({
    storyId: snapshot.session.storyId,
    revisionId: snapshot.session.revisionId,
    storyRepository: dependencies.storyRepository,
    ruleRepository: dependencies.ruleRepository,
    verdictRepository: dependencies.verdictRepository,
    verdictRunRepository: dependencies.verdictRunRepository,
    triggerKind: "manual",
    createdAt,
    softPriorConfig: dependencies.softPriorConfig
  });

  await dependencies.ingestionSessionRepository.setSessionState(sessionId, "checked", {
    updatedAt: createdAt,
    lastCheckedAt: createdAt,
    lastVerdictRunId: verdictRun.runId
  });

  return {
    sessionId,
    workflowState: "checked",
    storyId: snapshot.session.storyId,
    revisionId: snapshot.session.revisionId,
    runId: verdictRun.runId,
    previousRunId: verdictRun.previousRunId ?? null,
    softPrior: verdictRun.softPrior
  };
}
