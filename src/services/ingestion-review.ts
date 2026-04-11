import {
  CanonicalEntitySchema,
  CanonicalEventSchema,
  CausalLinkSchema,
  CharacterStateBoundarySchema,
  ReviewSegmentPatchSchema,
  RuleCandidateNormalizedPayloadSchema,
  type IngestionCandidateRecord,
  type IngestionSegmentSnapshot,
  type IngestionSessionRecord,
  type IngestionSessionSnapshot,
  type ReviewSegmentPatch
} from "../domain/index.js";
import {
  IngestionSessionRepository,
  ProvenanceRepository,
  RuleRepository,
  StoryRepository,
  type CanonicalStoryGraph
} from "../storage/index.js";

export class IngestionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestionConflictError";
  }
}

export class IngestionNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestionNotFoundError";
  }
}

interface ApplyReviewPatchDependencies {
  ingestionSessionRepository: IngestionSessionRepository;
  now?: () => string;
}

interface ApproveReviewedSegmentDependencies extends ApplyReviewPatchDependencies {
  storyRepository: StoryRepository;
  ruleRepository: RuleRepository;
  provenanceRepository: ProvenanceRepository;
}

function defaultNow(): string {
  return new Date().toISOString();
}

function reservedDraftTarget(session: IngestionSessionRecord) {
  return {
    storyId: `story:draft:${session.sessionId}`,
    revisionId: `revision:draft:${session.sessionId}`
  };
}

function isDraftTarget(session: IngestionSessionRecord): boolean {
  const reserved = reservedDraftTarget(session);
  return session.storyId === reserved.storyId && session.revisionId === reserved.revisionId;
}

function createEmptyGraph(session: IngestionSessionRecord): CanonicalStoryGraph {
  const reserved = reservedDraftTarget(session);
  return {
    story: {
      storyId: session.storyId ?? reserved.storyId,
      title: session.draftTitle || "Untitled Draft",
      description: "",
      defaultRulePackName: session.defaultRulePackName
    },
    revision: {
      revisionId: session.revisionId ?? reserved.revisionId,
      storyId: session.storyId ?? reserved.storyId,
      sourceKind: "normalized",
      createdAt: session.createdAt
    },
    entities: [],
    stateBoundaries: [],
    events: [],
    causalLinks: []
  };
}

async function loadPromotionGraph(
  session: IngestionSessionRecord,
  storyRepository: StoryRepository
): Promise<CanonicalStoryGraph> {
  const targetStoryId = session.storyId ?? reservedDraftTarget(session).storyId;
  const targetRevisionId = session.revisionId ?? reservedDraftTarget(session).revisionId;

  try {
    return await storyRepository.loadGraph(targetStoryId, targetRevisionId);
  } catch (error) {
    if (
      isDraftTarget(session) ||
      (error instanceof Error &&
        error.message === `Story graph not found for story=${targetStoryId} revision=${targetRevisionId}`)
    ) {
      return createEmptyGraph(session);
    }

    throw error;
  }
}

function upsertById<T>(
  items: T[],
  nextItem: T,
  getId: (value: T) => string
): T[] {
  const nextId = getId(nextItem);
  const existingIndex = items.findIndex((item) => getId(item) === nextId);
  if (existingIndex === -1) {
    return [...items, nextItem];
  }

  return items.map((item, index) => (index === existingIndex ? nextItem : item));
}

function sortGraph(graph: CanonicalStoryGraph): CanonicalStoryGraph {
  return {
    ...graph,
    entities: [...graph.entities].sort((left, right) => left.entityId.localeCompare(right.entityId)),
    stateBoundaries: [...graph.stateBoundaries].sort(
      (left, right) => left.sequence - right.sequence || left.boundaryId.localeCompare(right.boundaryId)
    ),
    events: [...graph.events].sort(
      (left, right) => left.sequence - right.sequence || left.eventId.localeCompare(right.eventId)
    ),
    causalLinks: [...graph.causalLinks].sort((left, right) => left.linkId.localeCompare(right.linkId))
  };
}

function requireSegment(snapshot: IngestionSessionSnapshot, segmentId: string): IngestionSegmentSnapshot {
  const segment = snapshot.segments.find((entry) => entry.segment.segmentId === segmentId);
  if (!segment) {
    throw new IngestionNotFoundError(
      `Segment ${segmentId} does not exist for session ${snapshot.session.sessionId}.`
    );
  }

  return segment;
}

function assertSegmentReadyForApproval(segment: IngestionSegmentSnapshot): void {
  const unresolved = segment.candidates.find((candidate) => candidate.normalizedPayload === null);
  if (unresolved) {
    throw new IngestionConflictError(
      `Segment ${segment.segment.segmentId} still has candidates with null normalized payload.`
    );
  }
}

async function promoteApprovedSegment(
  session: IngestionSessionRecord,
  segment: IngestionSegmentSnapshot,
  dependencies: ApproveReviewedSegmentDependencies
): Promise<void> {
  const graphCandidates = segment.candidates.filter((candidate) => candidate.candidateKind !== "rule");
  const ruleCandidates = segment.candidates.filter((candidate) => candidate.candidateKind === "rule");
  const provenanceRecords = [];

  if (graphCandidates.length > 0) {
    let graph = await loadPromotionGraph(session, dependencies.storyRepository);

    for (const candidate of graphCandidates) {
      const normalizedPayload = candidate.normalizedPayload;
      if (normalizedPayload === null) {
        continue;
      }

      if (candidate.candidateKind === "entity") {
        graph = {
          ...graph,
          entities: upsertById(graph.entities, CanonicalEntitySchema.parse(normalizedPayload), (item) => item.entityId)
        };
      } else if (candidate.candidateKind === "state_boundary") {
        graph = {
          ...graph,
          stateBoundaries: upsertById(
            graph.stateBoundaries,
            CharacterStateBoundarySchema.parse(normalizedPayload),
            (item) => item.boundaryId
          )
        };
      } else if (candidate.candidateKind === "event") {
        graph = {
          ...graph,
          events: upsertById(graph.events, CanonicalEventSchema.parse(normalizedPayload), (item) => item.eventId)
        };
      } else if (candidate.candidateKind === "causal_link") {
        graph = {
          ...graph,
          causalLinks: upsertById(
            graph.causalLinks,
            CausalLinkSchema.parse(normalizedPayload),
            (item) => item.linkId
          )
        };
      }

      provenanceRecords.push(createProvenanceRecord(session, segment, candidate));
    }

    await dependencies.storyRepository.saveGraph(sortGraph(graph));
  }

  for (const candidate of ruleCandidates) {
    if (candidate.normalizedPayload === null) {
      continue;
    }

    const normalizedRule = RuleCandidateNormalizedPayloadSchema.parse(candidate.normalizedPayload);
    await dependencies.ruleRepository.saveRulePack(normalizedRule.metadata, normalizedRule.version);
    provenanceRecords.push(createProvenanceRecord(session, segment, candidate));
  }

  if (provenanceRecords.length > 0) {
    await dependencies.provenanceRepository.saveMany(provenanceRecords);
  }
}

function createProvenanceRecord(
  session: IngestionSessionRecord,
  segment: IngestionSegmentSnapshot,
  candidate: IngestionCandidateRecord
) {
  const ownerId =
    candidate.candidateKind === "entity"
      ? CanonicalEntitySchema.parse(candidate.normalizedPayload).entityId
      : candidate.candidateKind === "state_boundary"
        ? CharacterStateBoundarySchema.parse(candidate.normalizedPayload).boundaryId
        : candidate.candidateKind === "event"
          ? CanonicalEventSchema.parse(candidate.normalizedPayload).eventId
          : candidate.candidateKind === "causal_link"
            ? CausalLinkSchema.parse(candidate.normalizedPayload).linkId
            : RuleCandidateNormalizedPayloadSchema.parse(candidate.normalizedPayload).version.ruleVersionId;

  return {
    provenanceId: `provenance:${session.sessionId}:${segment.segment.segmentId}:${candidate.candidateId}`,
    ownerType: candidate.candidateKind,
    ownerId,
    sourceKind: "normalized" as const,
    sourceRef: `ingestion:${session.sessionId}:${segment.segment.segmentId}:${candidate.candidateId}`,
    detail: {
      sessionId: session.sessionId,
      segmentId: segment.segment.segmentId,
      candidateId: candidate.candidateId,
      sourceSpanStart: candidate.sourceSpanStart,
      sourceSpanEnd: candidate.sourceSpanEnd,
      extractedPayload: candidate.extractedPayload,
      correctedPayload: candidate.correctedPayload
    }
  };
}

export async function applyReviewPatch(
  sessionId: string,
  segmentId: string,
  patchInput: ReviewSegmentPatch,
  dependencies: ApplyReviewPatchDependencies
): Promise<IngestionSessionSnapshot> {
  const patch = ReviewSegmentPatchSchema.parse(patchInput);
  const updatedAt = (dependencies.now ?? defaultNow)();
  return dependencies.ingestionSessionRepository.applySegmentPatch(sessionId, segmentId, patch, {
    updatedAt
  });
}

export async function approveReviewedSegment(
  sessionId: string,
  segmentId: string,
  dependencies: ApproveReviewedSegmentDependencies
): Promise<IngestionSessionSnapshot> {
  const snapshot = await dependencies.ingestionSessionRepository.loadSessionSnapshot(sessionId);
  const segment = requireSegment(snapshot, segmentId);
  assertSegmentReadyForApproval(segment);

  await promoteApprovedSegment(snapshot.session, segment, dependencies);

  const approvedAt = (dependencies.now ?? defaultNow)();
  await dependencies.ingestionSessionRepository.approveSegment(sessionId, segmentId, {
    approvedAt,
    updatedAt: approvedAt
  });

  return dependencies.ingestionSessionRepository.loadSessionSnapshot(sessionId);
}
