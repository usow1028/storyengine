import { z } from "zod";

import {
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
          provenanceDetail: z.record(z.string(), z.unknown())
        })
      )
    })
  )
});
export type IngestionSessionResponse = z.infer<typeof IngestionSessionResponseSchema>;

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
        provenanceDetail: candidate.provenanceDetail
      }))
    }))
  });
}
