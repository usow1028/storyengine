import {
  CanonicalEventSchema,
  IngestionWorkflowStateSchema,
  type DraftCheckScope,
  type DraftSourceTextRef,
  type IngestionSegmentSnapshot,
  type IngestionSessionSnapshot,
  type VerdictRunScope
} from "../domain/index.js";
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

interface ExecuteIngestionCheckOptions {
  scopeId?: string;
}

function orderedSegments(snapshot: IngestionSessionSnapshot): IngestionSegmentSnapshot[] {
  return [...snapshot.segments].sort(
    (left, right) =>
      left.segment.sequence - right.segment.sequence ||
      left.segment.segmentId.localeCompare(right.segment.segmentId)
  );
}

function ensureApprovedAndCurrentSegments(
  sessionId: string,
  segments: IngestionSegmentSnapshot[],
  message: string
): void {
  if (
    !segments.every(
      ({ segment }) =>
        segment.workflowState === "approved" &&
        segment.approvedAt !== null &&
        segment.stale === false
    )
  ) {
    throw new IngestionConflictError(message.replace("{sessionId}", sessionId));
  }
}

function resolveScope(snapshot: IngestionSessionSnapshot, scopeId: string): DraftCheckScope {
  const scope = snapshot.checkScopes.find((entry) => entry.scopeId === scopeId);
  if (!scope) {
    throw new IngestionConflictError(
      `Session ${snapshot.session.sessionId} does not have a persisted scope ${scopeId}.`
    );
  }

  return scope;
}

function resolveScopeSegments(
  snapshot: IngestionSessionSnapshot,
  scope: DraftCheckScope
): IngestionSegmentSnapshot[] {
  const segments = orderedSegments(snapshot);
  switch (scope.scopeKind) {
    case "full_approved_draft":
      return segments.filter(
        ({ segment }) =>
          segment.draftRevisionId === null || segment.draftRevisionId === scope.draftRevisionId
      );
    case "section":
      return segments.filter(({ segment }) => segment.sectionId === scope.sectionId);
    case "segment_range": {
      const resolved = segments.filter(({ segment }) => {
        if (segment.sequence < scope.startSequence || segment.sequence > scope.endSequence) {
          return false;
        }

        if (scope.sectionId && segment.sectionId !== scope.sectionId) {
          return false;
        }

        return true;
      });

      const hasStartSegment = resolved.some(({ segment }) => segment.segmentId === scope.startSegmentId);
      const hasEndSegment = resolved.some(({ segment }) => segment.segmentId === scope.endSegmentId);
      if (!hasStartSegment || !hasEndSegment) {
        throw new IngestionConflictError(
          `Scope ${scope.scopeId} does not resolve to the persisted start/end segment range.`
        );
      }

      return resolved;
    }
  }
}

function buildComparisonScopeKey(snapshot: IngestionSessionSnapshot, scope: DraftCheckScope): string {
  switch (scope.scopeKind) {
    case "full_approved_draft":
      return `full:${scope.documentId}`;
    case "section": {
      const section = snapshot.draftSections.find((entry) => entry.sectionId === scope.sectionId);
      if (!section) {
        throw new IngestionConflictError(
          `Scope ${scope.scopeId} references section ${scope.sectionId} that is not persisted in the session snapshot.`
        );
      }

      return `section:${scope.documentId}:${section.sectionKind}:${section.sequence}`;
    }
    case "segment_range":
      return `range:${scope.documentId}:${scope.sectionId ?? "document"}:${scope.startSequence}:${scope.endSequence}`;
  }
}

function collectScopeEventIds(segments: IngestionSegmentSnapshot[]): string[] {
  const eventIds: string[] = [];
  const seen = new Set<string>();

  for (const segment of segments) {
    for (const candidate of segment.candidates) {
      if (candidate.candidateKind !== "event" || candidate.normalizedPayload === null) {
        continue;
      }

      const event = CanonicalEventSchema.parse(candidate.normalizedPayload);
      if (seen.has(event.eventId)) {
        continue;
      }

      seen.add(event.eventId);
      eventIds.push(event.eventId);
    }
  }

  return eventIds;
}

function collectScopeSourceTextRefs(segments: IngestionSegmentSnapshot[]): DraftSourceTextRef[] {
  const refs: DraftSourceTextRef[] = [];
  const seen = new Set<string>();

  for (const { segment } of segments) {
    if (!segment.sourceTextRef) {
      continue;
    }

    const key = JSON.stringify(segment.sourceTextRef);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    refs.push(segment.sourceTextRef);
  }

  return refs;
}

function buildVerdictRunScope(
  snapshot: IngestionSessionSnapshot,
  scope: DraftCheckScope,
  segments: IngestionSegmentSnapshot[]
): VerdictRunScope {
  return {
    scopeId: scope.scopeId,
    scopeKind: scope.scopeKind,
    comparisonScopeKey: buildComparisonScopeKey(snapshot, scope),
    segmentIds: segments.map(({ segment }) => segment.segmentId),
    eventIds: collectScopeEventIds(segments),
    sourceTextRefs: collectScopeSourceTextRefs(segments),
    payload: scope
  };
}

export async function executeIngestionCheck(
  sessionId: string,
  dependencies: ExecuteIngestionCheckDependencies,
  options: ExecuteIngestionCheckOptions = {}
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
  const scope = options.scopeId ? resolveScope(snapshot, options.scopeId) : undefined;
  const resolvedScopeSegments = scope ? resolveScopeSegments(snapshot, scope) : [];

  if (scope) {
    if (resolvedScopeSegments.length === 0) {
      throw new IngestionConflictError(
        `Scope ${scope.scopeId} does not resolve to any persisted segment for session ${sessionId}.`
      );
    }

    ensureApprovedAndCurrentSegments(
      sessionId,
      resolvedScopeSegments,
      `Scope ${scope.scopeId} must have every segment in scope approved and current before a manual check can run.`
    );
  } else {
    ensureApprovedAndCurrentSegments(
      sessionId,
      snapshot.segments,
      `Session {sessionId} must have every segment approved and current before a manual check can run.`
    );
  }

  if (!scope && workflowState !== "approved") {
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
    softPriorConfig: dependencies.softPriorConfig,
    scope: scope ? buildVerdictRunScope(snapshot, scope, resolvedScopeSegments) : undefined
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
