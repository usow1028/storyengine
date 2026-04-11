import { z } from "zod";

import {
  DraftCheckScopeSchema,
  DraftDocumentIdSchema,
  DraftDocumentSchema,
  DraftRevisionIdSchema,
  DraftRevisionSchema,
  DraftSectionSchema,
  DraftSegmentPathSchema,
  DraftSourceTextRefSchema,
  IngestionSessionSnapshotSchema,
  RepairCandidateSchema,
  RepairPlausibilityAdjustmentSchema,
  RunInspectionResponseSchema,
  ReviewSegmentPatchSchema,
  SoftPriorAssessmentSchema,
  SubmissionInputKindSchema
} from "../domain/index.js";

export { RunInspectionResponseSchema };
export type RunInspectionResponse = z.infer<typeof RunInspectionResponseSchema>;

export const InspectionRunParamsSchema = z.object({
  runId: z.string().trim().min(1)
});
export type InspectionRunParams = z.infer<typeof InspectionRunParamsSchema>;

export const SubmitIngestionRequestSchema = z
  .object({
    submissionKind: SubmissionInputKindSchema,
    text: z.string().min(1),
    storyId: z.string().trim().min(1).optional(),
    revisionId: z.string().trim().min(1).optional(),
    draftTitle: z.string().trim().min(1).optional(),
    draft: z
      .object({
        documentId: DraftDocumentIdSchema.optional(),
        draftRevisionId: DraftRevisionIdSchema.optional(),
        title: z.string().trim().min(1).optional(),
        basedOnDraftRevisionId: DraftRevisionIdSchema.nullable().optional()
      })
      .optional(),
    defaultRulePackName: z.string().trim().min(1).optional()
  })
  .superRefine((value, ctx) => {
    const hasExistingTarget = Boolean(value.storyId && value.revisionId);
    const hasDraftTarget = Boolean(value.draftTitle || value.draft?.title);

    if (!hasExistingTarget && !hasDraftTarget) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide storyId/revisionId or draftTitle.",
        path: ["storyId"]
      });
    }
  });
export type SubmitIngestionRequest = z.infer<typeof SubmitIngestionRequestSchema>;

export const ExtractSubmissionRequestSchema = z
  .object({
    segmentIds: z.array(z.string().min(1)).optional(),
    allowApprovalReset: z.boolean().optional().default(false)
  })
  .default({ allowApprovalReset: false });
export type ExtractSubmissionRequest = z.infer<typeof ExtractSubmissionRequestSchema>;

export const ReviewSegmentPatchRequestSchema = ReviewSegmentPatchSchema;
export type ReviewSegmentPatchRequest = z.infer<typeof ReviewSegmentPatchRequestSchema>;

export const IngestionResponseDraftSchema = z.object({
  document: DraftDocumentSchema,
  revision: DraftRevisionSchema
});
export type IngestionResponseDraft = z.infer<typeof IngestionResponseDraftSchema>;

export const IngestionSessionResponseSchema = z.object({
  sessionId: z.string().min(1),
  workflowState: z.string().min(1),
  storyId: z.string().nullable(),
  revisionId: z.string().nullable(),
  draft: IngestionResponseDraftSchema.nullable(),
  sections: z.array(DraftSectionSchema).default([]),
  scopes: z.array(DraftCheckScopeSchema).default([]),
  progressSummary: z.object({
    totalSegments: z.number().int().nonnegative(),
    submittedSegments: z.number().int().nonnegative(),
    extractedSegments: z.number().int().nonnegative(),
    needsReviewSegments: z.number().int().nonnegative(),
    approvedSegments: z.number().int().nonnegative(),
    failedSegments: z.number().int().nonnegative(),
    staleSegments: z.number().int().nonnegative()
  }),
  segments: z.array(
    z.object({
      segmentId: z.string().min(1),
      label: z.string().min(1),
      sequence: z.number().int().nonnegative(),
      workflowState: z.string().min(1),
      startOffset: z.number().int().nonnegative(),
      endOffset: z.number().int().nonnegative(),
      segmentText: z.string().min(1),
      draftPath: DraftSegmentPathSchema.nullable(),
      sourceTextRef: DraftSourceTextRefSchema.nullable(),
      approvedAt: z.string().nullable(),
      attemptCount: z.number().int().nonnegative(),
      lastExtractionAt: z.string().nullable(),
      lastAttemptStatus: z.enum(["success", "failed"]).nullable(),
      lastFailureSummary: z.string().nullable(),
      stale: z.boolean(),
      staleReason: z.enum(["boundary_changed", "review_patch", "reextracted"]).nullable(),
      currentAttemptId: z.string().nullable(),
      attempts: z.array(
        z.object({
          attemptId: z.string().min(1),
          attemptNumber: z.number().int().positive(),
          requestKind: z.enum(["full_session", "targeted_retry"]),
          status: z.enum(["success", "failed"]),
          invalidatedApproval: z.boolean(),
          startedAt: z.string().min(1),
          finishedAt: z.string().nullable(),
          errorSummary: z.string().nullable()
        })
      ).default([]),
      candidates: z.array(
        z.object({
          candidateId: z.string().min(1),
          candidateKind: z.string().min(1),
          canonicalKey: z.string().min(1),
          confidence: z.number().min(0).max(1),
          reviewNeeded: z.boolean(),
          reviewNeededReason: z.string().nullable(),
          sourceSpanStart: z.number().int().nonnegative(),
          sourceSpanEnd: z.number().int().nonnegative(),
          provenanceDetail: z.record(z.string(), z.unknown()),
          extractedPayload: z.unknown(),
          correctedPayload: z.unknown().nullable(),
          normalizedPayload: z.unknown().nullable()
        })
      )
    })
  )
});
export type IngestionSessionResponse = z.infer<typeof IngestionSessionResponseSchema>;

export const SoftPriorAdvisoryResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("available"),
    assessment: SoftPriorAssessmentSchema,
    rerankedRepairs: z.array(RepairCandidateSchema),
    repairPlausibilityAdjustments: z.array(RepairPlausibilityAdjustmentSchema)
  }),
  z.object({
    status: z.enum([
      "disabled",
      "missing_snapshot",
      "invalid_snapshot",
      "insufficient_context"
    ]),
    reason: z.string().min(1),
    assessment: z.null(),
    rerankedRepairs: z.array(RepairCandidateSchema).length(0),
    repairPlausibilityAdjustments: z.array(RepairPlausibilityAdjustmentSchema).length(0)
  })
]);
export type SoftPriorAdvisoryResponse = z.infer<typeof SoftPriorAdvisoryResponseSchema>;

export const CheckIngestionRequestSchema = z
  .object({
    scopeId: z.string().trim().min(1).optional()
  })
  .default({});
export type CheckIngestionRequest = z.infer<typeof CheckIngestionRequestSchema>;

export const CheckIngestionResponseSchema = z.object({
  sessionId: z.string().min(1),
  workflowState: z.literal("checked"),
  storyId: z.string().min(1),
  revisionId: z.string().min(1),
  runId: z.string().min(1),
  previousRunId: z.string().nullable(),
  scopeId: z.string().min(1).nullable(),
  comparisonScopeKey: z.string().min(1).nullable(),
  softPrior: SoftPriorAdvisoryResponseSchema
});
export type CheckIngestionResponse = z.infer<typeof CheckIngestionResponseSchema>;

export function serializeIngestionSessionResponse(snapshotInput: unknown): IngestionSessionResponse {
  const snapshot = IngestionSessionSnapshotSchema.parse(snapshotInput);
  return IngestionSessionResponseSchema.parse({
    sessionId: snapshot.session.sessionId,
    workflowState: snapshot.session.workflowState,
    storyId: snapshot.session.storyId ?? null,
    revisionId: snapshot.session.revisionId ?? null,
    draft: snapshot.session.draft ?? null,
    sections: snapshot.draftSections ?? [],
    scopes: snapshot.checkScopes ?? [],
    progressSummary: snapshot.progressSummary,
    segments: snapshot.segments.map(({ segment, candidates, attempts }) => ({
      segmentId: segment.segmentId,
      label: segment.label,
      sequence: segment.sequence,
      workflowState: segment.workflowState,
      startOffset: segment.startOffset,
      endOffset: segment.endOffset,
      segmentText: segment.segmentText,
      draftPath: segment.draftPath ?? null,
      sourceTextRef: segment.sourceTextRef ?? null,
      approvedAt: segment.approvedAt ?? null,
      attemptCount: segment.attemptCount,
      lastExtractionAt: segment.lastExtractionAt ?? null,
      lastAttemptStatus: segment.lastAttemptStatus ?? null,
      lastFailureSummary: segment.lastFailureSummary ?? null,
      stale: segment.stale,
      staleReason: segment.staleReason ?? null,
      currentAttemptId: segment.currentAttemptId ?? null,
      attempts: attempts.map((attempt) => ({
        attemptId: attempt.attemptId,
        attemptNumber: attempt.attemptNumber,
        requestKind: attempt.requestKind,
        status: attempt.status,
        invalidatedApproval: attempt.invalidatedApproval,
        startedAt: attempt.startedAt,
        finishedAt: attempt.finishedAt ?? null,
        errorSummary: attempt.errorSummary ?? null
      })),
      candidates: candidates.map((candidate) => ({
        candidateId: candidate.candidateId,
        candidateKind: candidate.candidateKind,
        canonicalKey: candidate.canonicalKey,
        confidence: candidate.confidence,
        reviewNeeded: candidate.reviewNeeded,
        reviewNeededReason: candidate.reviewNeededReason ?? null,
        sourceSpanStart: candidate.sourceSpanStart,
        sourceSpanEnd: candidate.sourceSpanEnd,
        provenanceDetail: candidate.provenanceDetail,
        extractedPayload: candidate.extractedPayload,
        correctedPayload: candidate.correctedPayload ?? null,
        normalizedPayload: candidate.normalizedPayload ?? null
      }))
    }))
  });
}
