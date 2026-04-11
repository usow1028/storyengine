import { randomUUID } from "node:crypto";

import { z } from "zod";

import {
  CanonicalEntitySchema,
  CanonicalEventSchema,
  CausalLinkSchema,
  CharacterStateBoundarySchema,
  DraftSubmissionPlanSchema,
  IngestionCandidateRecordSchema,
  IngestionSessionRecordSchema,
  IngestionSegmentRecordSchema,
  IngestionSessionIdSchema,
  IngestionWorkflowStateSchema,
  ReviewNeededReasonSchema,
  RuleCandidateNormalizedPayloadSchema,
  StructuredExtractionBatchSchema,
  SubmissionInputKindSchema,
  type IngestionCandidateRecord,
  type IngestionSessionRecord,
  type IngestionSessionSnapshot,
  type IngestionSegmentRecord,
  type IngestionWorkflowState,
  type SubmissionInputKind
} from "../domain/index.js";
import { IngestionSessionRepository } from "../storage/index.js";
import {
  createConfiguredIngestionLlmClient,
  type IngestionLlmClient,
  type StructuredExtractionEnvelope
} from "./ingestion-llm-client.js";
import { IngestionConflictError, IngestionNotFoundError } from "./ingestion-review.js";

const PROMPT_FAMILY = "phase5-default";
const LOW_CONFIDENCE_THRESHOLD = 0.75;
const FALLBACK_SENTENCE_WINDOW = 5;
const FALLBACK_MAX_SEGMENT_LENGTH = 1200;
const SECTION_HEADING_PATTERN = /^(#+\s*)?(chapter|section)\b/i;

const SubmitIngestionSessionInputSchema = z
  .object({
    submissionKind: SubmissionInputKindSchema,
    text: z.string().min(1),
    storyId: z.string().trim().min(1).optional(),
    revisionId: z.string().trim().min(1).optional(),
    draftTitle: z.string().trim().min(1).optional(),
    draft: z
      .object({
        documentId: z.string().trim().min(1).optional(),
        draftRevisionId: z.string().trim().min(1).optional(),
        title: z.string().trim().min(1).optional(),
        basedOnDraftRevisionId: z.string().trim().min(1).nullable().optional()
      })
      .optional(),
    documentId: z.string().trim().min(1).optional(),
    draftRevisionId: z.string().trim().min(1).optional(),
    basedOnDraftRevisionId: z.string().trim().min(1).nullable().optional(),
    defaultRulePackName: z.string().trim().min(1).optional(),
    sessionId: z.string().trim().min(1).optional(),
    createdAt: z.string().min(1).optional()
  })
  .superRefine((value, ctx) => {
    const hasExistingTarget = Boolean(value.storyId && value.revisionId);
    const hasDraftTarget = Boolean(value.draftTitle);

    if (!hasExistingTarget && !hasDraftTarget) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide storyId/revisionId or draftTitle.",
        path: ["storyId"]
      });
    }
  });

type SubmitIngestionSessionInput = z.infer<typeof SubmitIngestionSessionInputSchema>;

type SubmitIngestionSessionDependencies = {
  ingestionSessionRepository: IngestionSessionRepository;
  llmClient: IngestionLlmClient;
  now?: () => string;
  generateId?: () => string;
};

type ExtractIngestionSessionDependencies = SubmitIngestionSessionDependencies;

const ExtractIngestionSessionOptionsSchema = z.object({
  targetSegmentIds: z.array(IngestionSegmentRecordSchema.shape.segmentId).optional(),
  allowApprovalReset: z.boolean().optional().default(false)
});

type SessionTarget = {
  storyId: string;
  revisionId: string;
};

function defaultNow(): string {
  return new Date().toISOString();
}

function defaultGenerateId(): string {
  return randomUUID();
}

function truncateErrorSummary(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 400);
}

function createSessionTarget(input: SubmitIngestionSessionInput, sessionId: string): SessionTarget {
  if (input.storyId && input.revisionId) {
    return {
      storyId: input.storyId,
      revisionId: input.revisionId
    };
  }

  return {
    storyId: `story:draft:${sessionId}`,
    revisionId: `revision:draft:${sessionId}`
  };
}

function sanitizeBlock(text: string): string {
  return normalizeDraftSourceText(text).trim();
}

function sentenceWindowSegments(text: string): Array<{ text: string; startOffset: number; endOffset: number }> {
  const sentencePattern = /[^.!?]+[.!?]+[\])"'`]*|[^.!?]+$/g;
  const sentences = [...text.matchAll(sentencePattern)]
    .map((match) => ({
      text: match[0].trim(),
      startOffset: match.index ?? 0,
      endOffset: (match.index ?? 0) + match[0].length
    }))
    .filter((sentence) => sentence.text.length > 0);

  if (sentences.length === 0) {
    return [
      {
        text,
        startOffset: 0,
        endOffset: text.length
      }
    ];
  }

  const segments: Array<{ text: string; startOffset: number; endOffset: number }> = [];
  for (let index = 0; index < sentences.length; ) {
    const first = sentences[index];
    let endIndex = Math.min(index + FALLBACK_SENTENCE_WINDOW, sentences.length);
    let segmentText = sentences
      .slice(index, endIndex)
      .map((sentence) => sentence.text)
      .join(" ");

    while (segmentText.length > FALLBACK_MAX_SEGMENT_LENGTH && endIndex - index > 1) {
      endIndex -= 1;
      segmentText = sentences
        .slice(index, endIndex)
        .map((sentence) => sentence.text)
        .join(" ");
    }

    const last = sentences[endIndex - 1];
    segments.push({
      text: segmentText,
      startOffset: first.startOffset,
      endOffset: last.endOffset
    });
    index = endIndex;
  }

  return segments;
}

function blockSegmentsFromDraft(text: string): Array<{ text: string; startOffset: number; endOffset: number }> {
  const separator = /\n\s*\n+/g;
  const segments: Array<{ text: string; startOffset: number; endOffset: number }> = [];
  let cursor = 0;
  let match = separator.exec(text);

  while (match) {
    const blockText = text.slice(cursor, match.index);
    const trimmed = sanitizeBlock(blockText);
    if (trimmed.length > 0) {
      const startOffset = text.indexOf(trimmed, cursor);
      segments.push({
        text: trimmed,
        startOffset,
        endOffset: startOffset + trimmed.length
      });
    }
    cursor = match.index + match[0].length;
    match = separator.exec(text);
  }

  const finalBlock = sanitizeBlock(text.slice(cursor));
  if (finalBlock.length > 0) {
    const startOffset = text.indexOf(finalBlock, cursor);
    segments.push({
      text: finalBlock,
      startOffset,
      endOffset: startOffset + finalBlock.length
    });
  }

  return segments;
}

function deriveSegmentLabel(segmentText: string, sequence: number, inputKind: SubmissionInputKind): string {
  if (inputKind === "chunk") {
    return "Chunk 1";
  }

  const firstLine = segmentText.split("\n")[0]?.trim() ?? "";
  if (/^(#+\s+|scene\b|chapter\b|section\b)/i.test(firstLine)) {
    return firstLine.replace(/^#+\s*/, "");
  }

  return `Segment ${sequence + 1}`;
}

function getSectionHeading(line: string): { label: string; sectionKind: "chapter" | "section" } | null {
  const match = line.trim().match(SECTION_HEADING_PATTERN);
  if (!match) {
    return null;
  }

  return {
    label: line.trim().replace(/^#+\s*/, ""),
    sectionKind: match[2]?.toLowerCase() === "chapter" ? "chapter" : "section"
  };
}

export function normalizeDraftSourceText(rawText: string): string {
  return rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function planDraftSubmission(input: {
  sessionId: string;
  inputKind: SubmissionInputKind;
  rawText: string;
  storyId?: string;
  revisionId?: string;
  documentId?: string;
  draftRevisionId?: string;
  basedOnDraftRevisionId?: string | null;
  draftTitle?: string;
  createdAt?: string;
}) {
  const parsed = z
    .object({
      sessionId: IngestionSessionRecordSchema.shape.sessionId,
      inputKind: SubmissionInputKindSchema,
      rawText: z.string().min(1),
      storyId: z.string().trim().min(1).optional(),
      revisionId: z.string().trim().min(1).optional(),
      documentId: z.string().trim().min(1).optional(),
      draftRevisionId: z.string().trim().min(1).optional(),
      basedOnDraftRevisionId: z.string().trim().min(1).nullable().optional(),
      draftTitle: z.string().optional(),
      createdAt: z.string().min(1).optional()
    })
    .parse(input);

  const createdAt = parsed.createdAt ?? new Date().toISOString();
  const documentId = parsed.documentId ?? `draft-document:${parsed.sessionId}`;
  const draftRevisionId = parsed.draftRevisionId ?? `draft-revision:${parsed.sessionId}`;
  const storyId = parsed.storyId ?? `story:draft:${parsed.sessionId}`;
  const revisionId = parsed.revisionId ?? `revision:draft:${parsed.sessionId}`;
  const normalizedRawText = normalizeDraftSourceText(parsed.rawText);

  const baseSegments =
    parsed.inputKind === "chunk"
      ? [{ text: sanitizeBlock(normalizedRawText), startOffset: 0, endOffset: sanitizeBlock(normalizedRawText).length }]
      : blockSegmentsFromDraft(normalizedRawText);

  const plannedSegments = parsed.inputKind === "full_draft" && baseSegments.length <= 1
    ? sentenceWindowSegments(normalizedRawText)
    : baseSegments;

  const sections: Array<{
    sectionId: string;
    draftRevisionId: string;
    sectionKind: "chapter" | "section";
    sequence: number;
    label: string;
    sourceTextRef: {
      sourceKind: "ingestion_session_raw_text";
      sessionId: string;
      startOffset: number;
      endOffset: number;
      textNormalization: "lf";
    };
  }> = [];
  let currentSectionId: string | null = null;

  const segments = plannedSegments.map((segment, index) => {
    const firstLine = segment.text.split("\n")[0]?.trim() ?? "";
    const heading = getSectionHeading(firstLine);
    const sourceTextRef = {
      sourceKind: "ingestion_session_raw_text" as const,
      sessionId: parsed.sessionId,
      startOffset: segment.startOffset,
      endOffset: segment.endOffset,
      textNormalization: "lf" as const
    };

    if (heading) {
      currentSectionId = `draft-section:${parsed.sessionId}:${sections.length + 1}`;
      sections.push({
        sectionId: currentSectionId,
        draftRevisionId,
        sectionKind: heading.sectionKind,
        sequence: sections.length,
        label: heading.label,
        sourceTextRef
      });
    }

    const segmentId = `segment:${parsed.sessionId}:${index + 1}`;
    const draftPath = {
      documentId,
      draftRevisionId,
      sectionId: currentSectionId,
      segmentId,
      sequence: index
    };

    const segmentRecord = IngestionSegmentRecordSchema.parse({
      segmentId,
      sessionId: parsed.sessionId,
      sequence: index,
      label: deriveSegmentLabel(segment.text, index, parsed.inputKind),
      startOffset: segment.startOffset,
      endOffset: segment.endOffset,
      segmentText: segment.text,
      draftRevisionId,
      sectionId: currentSectionId,
      draftPath,
      sourceTextRef,
      workflowState: "submitted",
      approvedAt: null
    });

    return {
      segment: segmentRecord,
      sourceTextRef,
      draftPath
    };
  });

  return DraftSubmissionPlanSchema.parse({
    document: {
      documentId,
      storyId,
      title: parsed.draftTitle ?? "",
      createdAt,
      updatedAt: createdAt
    },
    revision: {
      draftRevisionId,
      documentId,
      storyId,
      revisionId,
      basedOnDraftRevisionId: parsed.basedOnDraftRevisionId ?? null,
      createdAt
    },
    sections,
    segments,
    checkScopes: [
      {
        scopeKind: "full_approved_draft",
        scopeId: `draft-scope:${parsed.sessionId}:full`,
        documentId,
        draftRevisionId,
        storyId,
        revisionId
      }
    ],
    normalizedRawText
  });
}

export function segmentSubmissionText(input: {
  sessionId: string;
  inputKind: SubmissionInputKind;
  rawText: string;
}): IngestionSegmentRecord[] {
  const parsed = z
    .object({
      sessionId: IngestionSessionRecordSchema.shape.sessionId,
      inputKind: SubmissionInputKindSchema,
      rawText: z.string().min(1)
    })
    .parse(input);

  return planDraftSubmission(parsed).segments.map(({ segment }) => segment);
}

function ensureRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function enrichPayload(candidateKind: IngestionCandidateRecord["candidateKind"], payload: unknown, target: SessionTarget) {
  const record = ensureRecord(payload);

  if (candidateKind === "entity" || candidateKind === "state_boundary" || candidateKind === "event" || candidateKind === "causal_link") {
    return {
      ...record,
      storyId: target.storyId,
      revisionId: target.revisionId
    };
  }

  if (candidateKind === "rule") {
    const metadata = ensureRecord(record.metadata);
    const version = ensureRecord(record.version);

    return {
      metadata: {
        ...metadata,
        storyId: target.storyId,
        revisionId: target.revisionId,
        sourceKind:
          typeof metadata.sourceKind === "string" && metadata.sourceKind.length > 0 ? metadata.sourceKind : "normalized"
      },
      version
    };
  }

  return payload;
}

function normalizeCandidatePayload(candidateKind: IngestionCandidateRecord["candidateKind"], payload: unknown) {
  switch (candidateKind) {
    case "entity":
      return CanonicalEntitySchema.parse(payload);
    case "state_boundary":
      return CharacterStateBoundarySchema.parse(payload);
    case "event":
      return CanonicalEventSchema.parse(payload);
    case "causal_link":
      return CausalLinkSchema.parse(payload);
    case "rule":
      return RuleCandidateNormalizedPayloadSchema.parse(payload);
  }
}

function buildCandidateRecords(input: {
  sessionId: string;
  segmentId: string;
  target: SessionTarget;
  extraction: StructuredExtractionEnvelope;
  generateId: () => string;
}): IngestionCandidateRecord[] {
  const counts = new Map<string, number>();
  for (const candidate of input.extraction.candidates) {
    counts.set(candidate.canonicalKey, (counts.get(candidate.canonicalKey) ?? 0) + 1);
  }

  return input.extraction.candidates.map((candidate, index) => {
    const enrichedPayload = enrichPayload(candidate.candidateKind, candidate.payload, input.target);
    let normalizedPayload: unknown = null;
    let reviewNeeded = candidate.confidence < LOW_CONFIDENCE_THRESHOLD;
    let reviewNeededReason: z.infer<typeof ReviewNeededReasonSchema> | null = reviewNeeded ? "low_confidence" : null;

    try {
      normalizedPayload = normalizeCandidatePayload(candidate.candidateKind, enrichedPayload);
    } catch {
      reviewNeeded = true;
      reviewNeededReason = "normalization_failed";
    }

    if ((counts.get(candidate.canonicalKey) ?? 0) > 1) {
      reviewNeeded = true;
      reviewNeededReason = "conflicting_candidates";
    }

    return IngestionCandidateRecordSchema.parse({
      candidateId: candidate.candidateId ?? `candidate:${input.segmentId}:${index + 1}:${input.generateId()}`,
      sessionId: input.sessionId,
      segmentId: input.segmentId,
      candidateKind: candidate.candidateKind,
      canonicalKey: candidate.canonicalKey,
      confidence: candidate.confidence,
      reviewNeeded,
      reviewNeededReason,
      sourceSpanStart: candidate.sourceSpanStart,
      sourceSpanEnd: candidate.sourceSpanEnd,
      provenanceDetail: candidate.provenanceDetail,
      extractedPayload: candidate.payload,
      correctedPayload: null,
      normalizedPayload
    });
  });
}

export async function submitIngestionSession(
  input: SubmitIngestionSessionInput,
  dependencies: SubmitIngestionSessionDependencies
): Promise<IngestionSessionSnapshot> {
  const parsed = SubmitIngestionSessionInputSchema.parse(input);
  const now = dependencies.now ?? defaultNow;
  const generateId = dependencies.generateId ?? defaultGenerateId;
  const createdAt = parsed.createdAt ?? now();
  const sessionId = parsed.sessionId ?? `session:${generateId()}`;
  const target = createSessionTarget(parsed, sessionId);
  const plan = planDraftSubmission({
    sessionId,
    inputKind: parsed.submissionKind,
    rawText: parsed.text,
    storyId: target.storyId,
    revisionId: target.revisionId,
    documentId: parsed.documentId ?? parsed.draft?.documentId,
    draftRevisionId: parsed.draftRevisionId ?? parsed.draft?.draftRevisionId,
    basedOnDraftRevisionId: parsed.basedOnDraftRevisionId ?? parsed.draft?.basedOnDraftRevisionId ?? null,
    draftTitle: parsed.draft?.title ?? parsed.draftTitle,
    createdAt
  });

  const session = await dependencies.ingestionSessionRepository.createSession({
    sessionId,
    storyId: plan.document.storyId,
    revisionId: plan.revision.revisionId,
    draftTitle: plan.document.title,
    draftDocumentId: plan.document.documentId,
    draftRevisionId: plan.revision.draftRevisionId,
    draft: {
      document: plan.document,
      revision: plan.revision
    },
    defaultRulePackName: parsed.defaultRulePackName ?? "reality-default",
    inputKind: parsed.submissionKind,
    rawText: plan.normalizedRawText,
    workflowState: "submitted",
    promptFamily: PROMPT_FAMILY,
    modelName: dependencies.llmClient.modelName,
    lastVerdictRunId: null,
    createdAt,
    updatedAt: createdAt,
    lastCheckedAt: null
  });

  await dependencies.ingestionSessionRepository.saveDraftPlan(session.sessionId, plan);
  await dependencies.ingestionSessionRepository.saveSegments(
    session.sessionId,
    plan.segments.map(({ segment }) => segment)
  );

  return dependencies.ingestionSessionRepository.loadSessionSnapshot(session.sessionId);
}

export async function extractIngestionSession(
  sessionId: string,
  dependencies: ExtractIngestionSessionDependencies & {
    targetSegmentIds?: string[];
    allowApprovalReset?: boolean;
  }
): Promise<IngestionSessionSnapshot> {
  const generateId = dependencies.generateId ?? defaultGenerateId;
  const now = dependencies.now ?? defaultNow;
  const parsedSessionId = IngestionSessionIdSchema.parse(sessionId);
  const snapshot = await dependencies.ingestionSessionRepository.loadSessionSnapshot(parsedSessionId);
  const options = ExtractIngestionSessionOptionsSchema.parse({
    targetSegmentIds: dependencies.targetSegmentIds,
    allowApprovalReset: dependencies.allowApprovalReset
  });
  const segmentIds = options.targetSegmentIds ?? snapshot.segments.map(({ segment }) => segment.segmentId);
  const targetSegments = [];
  const segmentById = new Map(snapshot.segments.map((entry) => [entry.segment.segmentId, entry] as const));
  const seenSegmentIds = new Set<string>();

  for (const segmentIdValue of segmentIds) {
    if (seenSegmentIds.has(segmentIdValue)) {
      throw new IngestionConflictError(`Duplicate segmentId ${segmentIdValue} is not allowed.`);
    }
    seenSegmentIds.add(segmentIdValue);

    const targetSegment = segmentById.get(segmentIdValue);
    if (!targetSegment) {
      throw new IngestionNotFoundError(
        `Segment ${segmentIdValue} does not exist for session ${snapshot.session.sessionId}.`
      );
    }

    if ((targetSegment.segment.approvedAt || targetSegment.segment.workflowState === "approved") && !options.allowApprovalReset) {
      throw new IngestionConflictError("Approved segments require allowApprovalReset=true before retry.");
    }

    targetSegments.push(targetSegment);
  }

  if (targetSegments.length === 0) {
    throw new IngestionConflictError("At least one segmentId must be provided for extraction.");
  }

  const requestKind = targetSegments.length === snapshot.segments.length ? "full_session" : "targeted_retry";

  const batch = StructuredExtractionBatchSchema.parse({
    sessionId: snapshot.session.sessionId,
    segments: await Promise.all(
      targetSegments.map(async ({ segment, attempts }) => {
        const attemptNumber = attempts.length + 1;
        const attemptId = `attempt:${segment.segmentId}:${attemptNumber}`;
        const startedAt = now();
        const invalidatedApproval = Boolean(segment.approvedAt || segment.workflowState === "approved");

        try {
          const extraction = await dependencies.llmClient.extractSegment({
            sessionId: snapshot.session.sessionId,
            segmentId: segment.segmentId,
            segmentText: segment.segmentText
          });
          const candidates = buildCandidateRecords({
            sessionId: snapshot.session.sessionId,
            segmentId: segment.segmentId,
            target: {
              storyId: snapshot.session.storyId ?? `story:draft:${snapshot.session.sessionId}`,
              revisionId: snapshot.session.revisionId ?? `revision:draft:${snapshot.session.sessionId}`
            },
            extraction,
            generateId
          });
          const workflowState: IngestionWorkflowState =
            invalidatedApproval || candidates.some((candidate) => candidate.reviewNeeded)
              ? "needs_review"
              : "extracted";

          return {
            segmentId: segment.segmentId,
            workflowState,
            candidates,
            attempt: {
              attemptId,
              attemptNumber,
              requestKind,
              status: "success" as const,
              invalidatedApproval,
              startedAt,
              finishedAt: now(),
              errorSummary: null
            }
          };
        } catch (error) {
          return {
            segmentId: segment.segmentId,
            workflowState: "failed" as const,
            candidates: [],
            attempt: {
              attemptId,
              attemptNumber,
              requestKind,
              status: "failed" as const,
              invalidatedApproval,
              startedAt,
              finishedAt: now(),
              errorSummary: truncateErrorSummary(error)
            }
          };
        }
      })
    )
  });

  await dependencies.ingestionSessionRepository.saveExtractionBatch(batch);
  await dependencies.ingestionSessionRepository.recalculateSessionState(snapshot.session.sessionId, {
    updatedAt: now()
  });

  return dependencies.ingestionSessionRepository.loadSessionSnapshot(snapshot.session.sessionId);
}

export async function getIngestionSessionSnapshot(
  sessionId: string,
  dependencies: { ingestionSessionRepository: IngestionSessionRepository }
): Promise<IngestionSessionSnapshot> {
  return dependencies.ingestionSessionRepository.loadSessionSnapshot(sessionId);
}

export { createConfiguredIngestionLlmClient };
