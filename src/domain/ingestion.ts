import { z } from "zod";

import { CanonicalEventSchema, CausalLinkSchema } from "./events.js";
import { RevisionIdSchema, StoryIdSchema } from "./ids.js";
import { CanonicalEntitySchema } from "./entities.js";
import { RulePackMetadataSchema, NormalizedExecutableRuleSchema } from "./rules.js";
import { CharacterStateBoundarySchema } from "./state.js";
import {
  DraftCheckScopeSchema,
  DraftDocumentSchema,
  DraftRevisionIdSchema,
  DraftRevisionSchema,
  DraftSectionIdSchema,
  DraftSectionSchema,
  DraftSegmentPathSchema,
  DraftSourceTextRefSchema
} from "./drafts.js";

const IngestionIdSchema = z.string().trim().min(1);
const VerdictRunIdSchema = z.string().trim().min(1).describe("VerdictRunId");
const JsonRecordSchema = z.record(z.string(), z.unknown()).default({});

export const IngestionSessionIdSchema = IngestionIdSchema.describe("IngestionSessionId");
export type IngestionSessionId = z.infer<typeof IngestionSessionIdSchema>;

export const IngestionSegmentIdSchema = IngestionIdSchema.describe("IngestionSegmentId");
export type IngestionSegmentId = z.infer<typeof IngestionSegmentIdSchema>;

export const IngestionCandidateIdSchema = IngestionIdSchema.describe("IngestionCandidateId");
export type IngestionCandidateId = z.infer<typeof IngestionCandidateIdSchema>;

export const SubmissionInputKindSchema = z.enum(["chunk", "full_draft"]);
export type SubmissionInputKind = z.infer<typeof SubmissionInputKindSchema>;

export const IngestionWorkflowStateSchema = z.enum([
  "submitted",
  "extracted",
  "needs_review",
  "partially_approved",
  "approved",
  "checked"
]);
export type IngestionWorkflowState = z.infer<typeof IngestionWorkflowStateSchema>;

export const StructuredCandidateKindSchema = z.enum([
  "entity",
  "state_boundary",
  "event",
  "causal_link",
  "rule"
]);
export type StructuredCandidateKind = z.infer<typeof StructuredCandidateKindSchema>;

export const ReviewNeededReasonSchema = z.enum([
  "low_confidence",
  "conflicting_candidates",
  "normalization_failed"
]);
export type ReviewNeededReason = z.infer<typeof ReviewNeededReasonSchema>;

export const RuleCandidateNormalizedPayloadSchema = z.object({
  metadata: RulePackMetadataSchema,
  version: NormalizedExecutableRuleSchema
});
export type RuleCandidateNormalizedPayload = z.infer<typeof RuleCandidateNormalizedPayloadSchema>;

export const StructuredNormalizedPayloadSchema = z.union([
  CanonicalEntitySchema,
  CharacterStateBoundarySchema,
  CanonicalEventSchema,
  CausalLinkSchema,
  RuleCandidateNormalizedPayloadSchema
]);
export type StructuredNormalizedPayload = z.infer<typeof StructuredNormalizedPayloadSchema>;

export const IngestionSessionRecordSchema = z.object({
  sessionId: IngestionSessionIdSchema,
  storyId: StoryIdSchema.nullable().optional().default(null),
  revisionId: RevisionIdSchema.nullable().optional().default(null),
  draftTitle: z.string().default(""),
  draftDocumentId: z.string().trim().min(1).nullable().optional().default(null),
  draftRevisionId: z.lazy(() => DraftRevisionIdSchema).nullable().optional().default(null),
  draft: z
    .object({
      document: z.lazy(() => DraftDocumentSchema),
      revision: z.lazy(() => DraftRevisionSchema)
    })
    .nullable()
    .optional()
    .default(null),
  defaultRulePackName: z.string().default("reality-default"),
  inputKind: SubmissionInputKindSchema,
  rawText: z.string().min(1),
  workflowState: IngestionWorkflowStateSchema,
  promptFamily: z.string().min(1),
  modelName: z.string().min(1),
  lastVerdictRunId: VerdictRunIdSchema.nullable().optional().default(null),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  lastCheckedAt: z.string().nullable().optional().default(null)
});
export type IngestionSessionRecord = z.infer<typeof IngestionSessionRecordSchema>;
export type IngestionSessionRecordInput = z.input<typeof IngestionSessionRecordSchema>;

export const IngestionSegmentRecordSchema = z.object({
  segmentId: IngestionSegmentIdSchema,
  sessionId: IngestionSessionIdSchema,
  sequence: z.number().int().nonnegative(),
  label: z.string().min(1),
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().nonnegative(),
  segmentText: z.string().min(1),
  draftRevisionId: z.lazy(() => DraftRevisionIdSchema).nullable().optional().default(null),
  sectionId: z.lazy(() => DraftSectionIdSchema).nullable().optional().default(null),
  draftPath: z.lazy(() => DraftSegmentPathSchema).nullable().optional().default(null),
  sourceTextRef: z.lazy(() => DraftSourceTextRefSchema).nullable().optional().default(null),
  workflowState: IngestionWorkflowStateSchema,
  approvedAt: z.string().nullable().optional().default(null)
});
export type IngestionSegmentRecord = z.infer<typeof IngestionSegmentRecordSchema>;
export type IngestionSegmentRecordInput = z.input<typeof IngestionSegmentRecordSchema>;

export const IngestionCandidateRecordSchema = z.object({
  candidateId: IngestionCandidateIdSchema,
  sessionId: IngestionSessionIdSchema,
  segmentId: IngestionSegmentIdSchema,
  candidateKind: StructuredCandidateKindSchema,
  canonicalKey: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reviewNeeded: z.boolean(),
  reviewNeededReason: ReviewNeededReasonSchema.nullable().optional().default(null),
  sourceSpanStart: z.number().int().nonnegative(),
  sourceSpanEnd: z.number().int().nonnegative(),
  provenanceDetail: JsonRecordSchema,
  extractedPayload: z.unknown(),
  correctedPayload: z.unknown().nullable().optional().default(null),
  normalizedPayload: StructuredNormalizedPayloadSchema.nullable().optional().default(null)
});
export type IngestionCandidateRecord = z.infer<typeof IngestionCandidateRecordSchema>;

export const ReviewCandidateCorrectionSchema = z.object({
  candidateId: IngestionCandidateIdSchema,
  correctedPayload: z.unknown()
});
export type ReviewCandidateCorrection = z.infer<typeof ReviewCandidateCorrectionSchema>;

export const ReviewSegmentBoundaryPatchSchema = z
  .object({
    label: z.string().trim().min(1).optional(),
    startOffset: z.number().int().nonnegative().optional(),
    endOffset: z.number().int().nonnegative().optional()
  })
  .superRefine((value, ctx) => {
    if (
      typeof value.label === "undefined" &&
      typeof value.startOffset === "undefined" &&
      typeof value.endOffset === "undefined"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Boundary patches must update at least one field."
      });
    }

    if (
      typeof value.startOffset === "number" &&
      typeof value.endOffset === "number" &&
      value.startOffset > value.endOffset
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Boundary patch startOffset cannot exceed endOffset.",
        path: ["startOffset"]
      });
    }
  });
export type ReviewSegmentBoundaryPatch = z.infer<typeof ReviewSegmentBoundaryPatchSchema>;

export const ReviewSegmentPatchSchema = z
  .object({
    boundary: ReviewSegmentBoundaryPatchSchema.optional(),
    candidateCorrections: z.array(ReviewCandidateCorrectionSchema).default([])
  })
  .superRefine((value, ctx) => {
    if (!value.boundary && value.candidateCorrections.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Review patches must include a boundary update or at least one candidate correction."
      });
    }
  });
export type ReviewSegmentPatch = z.infer<typeof ReviewSegmentPatchSchema>;

export const SegmentApprovalResultSchema = z.object({
  sessionId: IngestionSessionIdSchema,
  segmentId: IngestionSegmentIdSchema,
  sessionWorkflowState: IngestionWorkflowStateSchema,
  segmentWorkflowState: IngestionWorkflowStateSchema,
  approvedAt: z.string().nullable().optional().default(null)
});
export type SegmentApprovalResult = z.infer<typeof SegmentApprovalResultSchema>;

export const StructuredExtractionSegmentSchema = z.object({
  segmentId: IngestionSegmentIdSchema,
  workflowState: IngestionWorkflowStateSchema,
  candidates: z.array(IngestionCandidateRecordSchema).default([])
});
export type StructuredExtractionSegment = z.infer<typeof StructuredExtractionSegmentSchema>;

export const StructuredExtractionBatchSchema = z.object({
  sessionId: IngestionSessionIdSchema,
  segments: z.array(StructuredExtractionSegmentSchema).default([])
});
export type StructuredExtractionBatch = z.infer<typeof StructuredExtractionBatchSchema>;

export const IngestionSegmentSnapshotSchema = z.object({
  segment: IngestionSegmentRecordSchema,
  candidates: z.array(IngestionCandidateRecordSchema).default([])
});
export type IngestionSegmentSnapshot = z.infer<typeof IngestionSegmentSnapshotSchema>;

export const IngestionSessionSnapshotSchema = z.object({
  session: IngestionSessionRecordSchema,
  segments: z.array(IngestionSegmentSnapshotSchema).default([]),
  draftSections: z.array(z.lazy(() => DraftSectionSchema)).default([]),
  checkScopes: z.array(z.lazy(() => DraftCheckScopeSchema)).default([])
});
export type IngestionSessionSnapshot = z.infer<typeof IngestionSessionSnapshotSchema>;
