import { z } from "zod";

import { RevisionIdSchema, StoryIdSchema } from "./ids.js";
import { IngestionSegmentRecordSchema } from "./ingestion.js";

const DraftIdSchema = z.string().trim().min(1);

export const DraftDocumentIdSchema = DraftIdSchema.describe("DraftDocumentId");
export type DraftDocumentId = z.infer<typeof DraftDocumentIdSchema>;

export const DraftRevisionIdSchema = DraftIdSchema.describe("DraftRevisionId");
export type DraftRevisionId = z.infer<typeof DraftRevisionIdSchema>;

export const DraftSectionIdSchema = DraftIdSchema.describe("DraftSectionId");
export type DraftSectionId = z.infer<typeof DraftSectionIdSchema>;

export const DraftCheckScopeIdSchema = DraftIdSchema.describe("DraftCheckScopeId");
export type DraftCheckScopeId = z.infer<typeof DraftCheckScopeIdSchema>;

export const DraftSourceTextRefSchema = z
  .object({
    sourceKind: z.literal("ingestion_session_raw_text"),
    sessionId: DraftIdSchema.describe("IngestionSessionId"),
    startOffset: z.number().int().nonnegative(),
    endOffset: z.number().int().nonnegative(),
    textNormalization: z.literal("lf")
  })
  .superRefine((value, ctx) => {
    if (value.startOffset > value.endOffset) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "sourceTextRef startOffset cannot exceed endOffset.",
        path: ["startOffset"]
      });
    }
  });
export type DraftSourceTextRef = z.infer<typeof DraftSourceTextRefSchema>;

export const DraftDocumentSchema = z.object({
  documentId: DraftDocumentIdSchema,
  storyId: StoryIdSchema,
  title: z.string().default(""),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});
export type DraftDocument = z.infer<typeof DraftDocumentSchema>;

export const DraftRevisionSchema = z.object({
  draftRevisionId: DraftRevisionIdSchema,
  documentId: DraftDocumentIdSchema,
  storyId: StoryIdSchema,
  revisionId: RevisionIdSchema,
  basedOnDraftRevisionId: DraftRevisionIdSchema.nullable().optional().default(null),
  createdAt: z.string().min(1)
});
export type DraftRevision = z.infer<typeof DraftRevisionSchema>;

export const DraftSectionSchema = z.object({
  sectionId: DraftSectionIdSchema,
  draftRevisionId: DraftRevisionIdSchema,
  sectionKind: z.enum(["chapter", "section"]),
  sequence: z.number().int().nonnegative(),
  label: z.string().trim().min(1),
  sourceTextRef: DraftSourceTextRefSchema
});
export type DraftSection = z.infer<typeof DraftSectionSchema>;

export const DraftSegmentPathSchema = z.object({
  documentId: DraftDocumentIdSchema,
  draftRevisionId: DraftRevisionIdSchema,
  sectionId: DraftSectionIdSchema.nullable().optional().default(null),
  segmentId: DraftIdSchema.describe("IngestionSegmentId"),
  sequence: z.number().int().nonnegative()
});
export type DraftSegmentPath = z.infer<typeof DraftSegmentPathSchema>;

const FullApprovedDraftScopeSchema = z.object({
  scopeKind: z.literal("full_approved_draft"),
  scopeId: DraftCheckScopeIdSchema,
  documentId: DraftDocumentIdSchema,
  draftRevisionId: DraftRevisionIdSchema,
  storyId: StoryIdSchema,
  revisionId: RevisionIdSchema
});

const SectionScopeSchema = z.object({
  scopeKind: z.literal("section"),
  scopeId: DraftCheckScopeIdSchema,
  documentId: DraftDocumentIdSchema,
  draftRevisionId: DraftRevisionIdSchema,
  sectionId: DraftSectionIdSchema,
  sourceTextRef: DraftSourceTextRefSchema.optional()
});

const SegmentRangeScopeSchema = z
  .object({
    scopeKind: z.literal("segment_range"),
    scopeId: DraftCheckScopeIdSchema,
    documentId: DraftDocumentIdSchema,
    draftRevisionId: DraftRevisionIdSchema,
    startSegmentId: DraftIdSchema.describe("IngestionSegmentId"),
    endSegmentId: DraftIdSchema.describe("IngestionSegmentId"),
    startSequence: z.number().int().nonnegative(),
    endSequence: z.number().int().nonnegative(),
    sectionId: DraftSectionIdSchema.nullable().optional().default(null),
    sourceTextRef: DraftSourceTextRefSchema.optional()
  })
  .superRefine((value, ctx) => {
    if (value.startSequence > value.endSequence) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "segment_range startSequence cannot exceed endSequence.",
        path: ["startSequence"]
      });
    }
  });

export const DraftCheckScopeSchema = z.discriminatedUnion("scopeKind", [
  FullApprovedDraftScopeSchema,
  SectionScopeSchema,
  SegmentRangeScopeSchema
]);
export type DraftCheckScope = z.infer<typeof DraftCheckScopeSchema>;

const DraftSubmissionSegmentSchema = z.object({
  segment: z.lazy(() => IngestionSegmentRecordSchema),
  sourceTextRef: DraftSourceTextRefSchema,
  draftPath: DraftSegmentPathSchema
});

export const DraftSubmissionPlanSchema = z.object({
  document: DraftDocumentSchema,
  revision: DraftRevisionSchema,
  sections: z.array(DraftSectionSchema).default([]),
  segments: z.array(DraftSubmissionSegmentSchema).default([]),
  checkScopes: z.array(DraftCheckScopeSchema).default([]),
  normalizedRawText: z.string().min(1)
});
export type DraftSubmissionPlan = z.infer<typeof DraftSubmissionPlanSchema>;
