import { z } from "zod";

import {
  ReviewSegmentPatchSchema,
  IngestionSessionSnapshotSchema,
  SubmissionInputKindSchema
} from "../domain/index.js";

export const SubmitIngestionRequestSchema = z
  .object({
    submissionKind: SubmissionInputKindSchema,
    text: z.string().min(1),
    storyId: z.string().trim().min(1).optional(),
    revisionId: z.string().trim().min(1).optional(),
    draftTitle: z.string().trim().min(1).optional(),
    defaultRulePackName: z.string().trim().min(1).optional()
  })
  .superRefine((value, ctx) => {
    const hasExistingTarget = Boolean(value.storyId && value.revisionId);
    if (!hasExistingTarget && !value.draftTitle) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide storyId/revisionId or draftTitle.",
        path: ["storyId"]
      });
    }
  });
export type SubmitIngestionRequest = z.infer<typeof SubmitIngestionRequestSchema>;

export const ExtractSubmissionRequestSchema = z.object({}).default({});
export type ExtractSubmissionRequest = z.infer<typeof ExtractSubmissionRequestSchema>;

export const ReviewSegmentPatchRequestSchema = ReviewSegmentPatchSchema;
export type ReviewSegmentPatchRequest = z.infer<typeof ReviewSegmentPatchRequestSchema>;

export const IngestionSessionResponseSchema = z.object({
  sessionId: z.string().min(1),
  workflowState: z.string().min(1),
  storyId: z.string().nullable(),
  revisionId: z.string().nullable(),
  segments: z.array(
    z.object({
      segmentId: z.string().min(1),
      label: z.string().min(1),
      sequence: z.number().int().nonnegative(),
      workflowState: z.string().min(1),
      startOffset: z.number().int().nonnegative(),
      endOffset: z.number().int().nonnegative(),
      segmentText: z.string().min(1),
      approvedAt: z.string().nullable(),
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

export const CheckIngestionResponseSchema = z.object({
  sessionId: z.string().min(1),
  workflowState: z.literal("checked"),
  storyId: z.string().min(1),
  revisionId: z.string().min(1),
  runId: z.string().min(1),
  previousRunId: z.string().nullable()
});
export type CheckIngestionResponse = z.infer<typeof CheckIngestionResponseSchema>;

export function serializeIngestionSessionResponse(snapshotInput: unknown): IngestionSessionResponse {
  const snapshot = IngestionSessionSnapshotSchema.parse(snapshotInput);
  return IngestionSessionResponseSchema.parse({
    sessionId: snapshot.session.sessionId,
    workflowState: snapshot.session.workflowState,
    storyId: snapshot.session.storyId ?? null,
    revisionId: snapshot.session.revisionId ?? null,
    segments: snapshot.segments.map(({ segment, candidates }) => ({
      segmentId: segment.segmentId,
      label: segment.label,
      sequence: segment.sequence,
      workflowState: segment.workflowState,
      startOffset: segment.startOffset,
      endOffset: segment.endOffset,
      segmentText: segment.segmentText,
      approvedAt: segment.approvedAt ?? null,
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
