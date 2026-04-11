import { z } from "zod";

import {
  EventEvidenceSummarySchema,
  CheckerKindSchema,
  MissingPremiseSchema,
  NotEvaluatedFindingSchema,
  RuleEvidenceSummarySchema,
  StateEvidenceSummarySchema,
  SupportingFindingSchema,
  VerdictKindSchema,
  VerdictRunTriggerKindSchema,
  ViolationCategorySchema,
  type VerdictKind
} from "./verdicts.js";
import {
  EventIdSchema,
  ProvenanceIdSchema,
  RevisionIdSchema,
  RuleVersionIdSchema,
  StateBoundaryIdSchema,
  StoryIdSchema,
  VerdictIdSchema
} from "./ids.js";
import {
  DraftDocumentIdSchema,
  DraftSectionIdSchema,
  DraftSourceTextRefSchema
} from "./drafts.js";
import {
  IngestionSegmentIdSchema,
  IngestionSessionIdSchema,
  IngestionWorkflowStateSchema
} from "./ingestion.js";
import { RepairCandidateSchema } from "./repairs.js";
import { RepairPlausibilityAdjustmentSchema, SoftPriorAssessmentSchema } from "./priors.js";

export const VERDICT_KIND_ORDER = [
  "Hard Contradiction",
  "Repairable Gap",
  "Soft Drift",
  "Consistent"
] as const satisfies readonly VerdictKind[];

export const InspectionRepairCandidateSchema = RepairCandidateSchema.extend({
  plausibilityAdjustment: RepairPlausibilityAdjustmentSchema.nullable().default(null)
});
export type InspectionRepairCandidate = z.infer<typeof InspectionRepairCandidateSchema>;

export const InspectionAdvisorySchema = z.discriminatedUnion("status", [
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
    rerankedRepairs: z.array(RepairCandidateSchema).length(0).default([]),
    repairPlausibilityAdjustments: z
      .array(RepairPlausibilityAdjustmentSchema)
      .length(0)
      .default([])
  })
]);
export type InspectionAdvisory = z.infer<typeof InspectionAdvisorySchema>;

export const InspectionScopeSummarySchema = z.object({
  scopeId: z.string().min(1),
  scopeKind: z.enum(["full_approved_draft", "section", "segment_range"]),
  comparisonScopeKey: z.string().min(1),
  documentId: DraftDocumentIdSchema.nullable().optional().default(null),
  draftRevisionId: z.string().min(1).nullable().optional().default(null),
  segmentCount: z.number().int().nonnegative(),
  eventCount: z.number().int().nonnegative(),
  sourceTextRefCount: z.number().int().nonnegative()
});
export type InspectionScopeSummary = z.infer<typeof InspectionScopeSummarySchema>;

export const InspectionOperationalWarningKindSchema = z.enum([
  "stale_segments",
  "unresolved_segments",
  "failed_segments"
]);
export type InspectionOperationalWarningKind = z.infer<
  typeof InspectionOperationalWarningKindSchema
>;

export const InspectionOperationalSummarySchema = z.object({
  workflowState: IngestionWorkflowStateSchema,
  totalSegmentCount: z.number().int().nonnegative(),
  approvedSegmentCount: z.number().int().nonnegative(),
  staleSegmentCount: z.number().int().nonnegative(),
  unresolvedSegmentCount: z.number().int().nonnegative(),
  failedSegmentCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
  warningKinds: z.array(InspectionOperationalWarningKindSchema).default([])
});
export type InspectionOperationalSummary = z.infer<
  typeof InspectionOperationalSummarySchema
>;

export const InspectionReviewStateSchema = z.union([
  IngestionWorkflowStateSchema,
  z.literal("stale")
]);
export type InspectionReviewState = z.infer<typeof InspectionReviewStateSchema>;

export const InspectionSecondaryGroupSchema = z.object({
  groupKey: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(["chapter", "section", "scope"]),
  sectionId: DraftSectionIdSchema.nullable().optional().default(null),
  documentId: DraftDocumentIdSchema.nullable().optional().default(null)
});
export type InspectionSecondaryGroup = z.infer<typeof InspectionSecondaryGroupSchema>;

export const InspectionProvenanceSummarySchema = z.object({
  provenanceId: ProvenanceIdSchema.nullable().optional().default(null),
  sessionId: IngestionSessionIdSchema.nullable().optional().default(null),
  segmentId: IngestionSegmentIdSchema.nullable().optional().default(null),
  segmentLabel: z.string().min(1).nullable().optional().default(null),
  reviewState: InspectionReviewStateSchema.nullable().optional().default(null),
  sectionId: DraftSectionIdSchema.nullable().optional().default(null),
  sectionLabel: z.string().min(1).nullable().optional().default(null),
  sectionKind: z.enum(["chapter", "section"]).nullable().optional().default(null),
  sourceSpans: z.array(DraftSourceTextRefSchema).default([])
});
export type InspectionProvenanceSummary = z.infer<
  typeof InspectionProvenanceSummarySchema
>;

export const InspectionSourceContextSchema = z.object({
  provenanceIds: z.array(ProvenanceIdSchema).default([]),
  sessionId: IngestionSessionIdSchema.nullable().optional().default(null),
  segmentId: IngestionSegmentIdSchema.nullable().optional().default(null),
  segmentLabel: z.string().min(1).nullable().optional().default(null),
  reviewState: InspectionReviewStateSchema.nullable().optional().default(null),
  sectionId: DraftSectionIdSchema.nullable().optional().default(null),
  sectionLabel: z.string().min(1).nullable().optional().default(null),
  sectionKind: z.enum(["chapter", "section"]).nullable().optional().default(null),
  sourceSpans: z.array(DraftSourceTextRefSchema).default([])
});
export type InspectionSourceContext = z.infer<typeof InspectionSourceContextSchema>;

export const RunInspectionSnapshotSchema = z.object({
  runId: z.string().min(1),
  createdAt: z.string().min(1),
  repairCandidates: z.array(RepairCandidateSchema).default([]),
  advisory: InspectionAdvisorySchema,
  operationalSummary: InspectionOperationalSummarySchema.nullable().optional()
});
export type RunInspectionSnapshot = z.infer<typeof RunInspectionSnapshotSchema>;

export const InspectionRunSchema = z.object({
  runId: z.string().min(1),
  storyId: StoryIdSchema,
  revisionId: RevisionIdSchema,
  previousRunId: z.string().min(1).nullable(),
  triggerKind: VerdictRunTriggerKindSchema,
  createdAt: z.string().min(1),
  scopeSummary: InspectionScopeSummarySchema.nullable().optional(),
  operationalSummary: InspectionOperationalSummarySchema.nullable().optional()
});
export type InspectionRun = z.infer<typeof InspectionRunSchema>;

export const InspectionDeterministicVerdictSchema = z.object({
  verdictId: VerdictIdSchema,
  verdictKind: VerdictKindSchema,
  category: ViolationCategorySchema,
  explanation: z.string().min(1),
  findingId: z.string().min(1).nullable(),
  representativeChecker: CheckerKindSchema.nullable(),
  reasonCode: z.string().min(1).nullable(),
  createdAt: z.string().min(1)
});
export type InspectionDeterministicVerdict = z.infer<
  typeof InspectionDeterministicVerdictSchema
>;

export const InspectionEvidenceSummarySchema = z.object({
  summary: z.string().min(1),
  eventCount: z.number().int().nonnegative(),
  stateCount: z.number().int().nonnegative(),
  ruleCount: z.number().int().nonnegative(),
  missingPremiseCount: z.number().int().nonnegative(),
  supportingFindingCount: z.number().int().nonnegative(),
  relatedEventIds: z.array(EventIdSchema).default([])
});
export type InspectionEvidenceSummary = z.infer<typeof InspectionEvidenceSummarySchema>;

export const InspectionVerdictSummarySchema = z.object({
  verdictId: VerdictIdSchema,
  verdictKind: VerdictKindSchema,
  category: ViolationCategorySchema,
  explanation: z.string().min(1),
  findingId: z.string().min(1).nullable(),
  reasonCode: z.string().min(1).nullable(),
  relatedEventIds: z.array(EventIdSchema).default([]),
  eventCount: z.number().int().nonnegative(),
  repairCandidateCount: z.number().int().nonnegative(),
  createdAt: z.string().min(1),
  secondaryGroup: InspectionSecondaryGroupSchema.nullable().optional(),
  provenanceSummary: InspectionProvenanceSummarySchema.nullable().optional()
});
export type InspectionVerdictSummary = z.infer<typeof InspectionVerdictSummarySchema>;

export const InspectionTimelineItemSchema = z.object({
  eventId: EventIdSchema,
  sequence: z.number().int().nonnegative(),
  eventType: z.string().min(1),
  summary: z.string().min(1),
  abstract: z.boolean(),
  actorIds: z.array(z.string().min(1)).default([]),
  targetIds: z.array(z.string().min(1)).default([]),
  placeId: z.string().min(1).nullable(),
  timeRelation: z.string().min(1),
  relatedStateBoundaryIds: z.array(StateBoundaryIdSchema).default([]),
  relatedRuleVersionIds: z.array(RuleVersionIdSchema).default([]),
  conflictPath: z.array(z.string().min(1)).default([])
});
export type InspectionTimelineItem = z.infer<typeof InspectionTimelineItemSchema>;

export const InspectionTraceFieldsSchema = z.object({
  findingId: z.string().min(1).nullable(),
  representativeChecker: z.string().min(1).nullable(),
  reasonCode: z.string().min(1).nullable(),
  eventIds: z.array(EventIdSchema).default([]),
  stateBoundaryIds: z.array(StateBoundaryIdSchema).default([]),
  ruleVersionIds: z.array(RuleVersionIdSchema).default([]),
  provenanceIds: z.array(ProvenanceIdSchema).default([]),
  conflictPath: z.array(z.string().min(1)).default([]),
  missingPremises: z.array(MissingPremiseSchema).default([]),
  supportingFindings: z.array(SupportingFindingSchema).default([]),
  notEvaluated: z.array(NotEvaluatedFindingSchema).default([])
});
export type InspectionTraceFields = z.infer<typeof InspectionTraceFieldsSchema>;

export const InspectionDiffFindingChangeSchema = z.object({
  changeKind: z.enum(["added", "resolved", "persisted", "changed_supporting"]),
  findingId: z.string().min(1),
  verdictKind: VerdictKindSchema,
  scopeId: z.string().min(1).nullable(),
  comparisonScopeKey: z.string().min(1).nullable(),
  representativeChecker: CheckerKindSchema.nullable(),
  reasonCode: z.string().min(1).nullable(),
  eventIds: z.array(EventIdSchema).default([]),
  stateBoundaryIds: z.array(StateBoundaryIdSchema).default([]),
  ruleVersionIds: z.array(RuleVersionIdSchema).default([]),
  provenanceIds: z.array(ProvenanceIdSchema).default([])
});
export type InspectionDiffFindingChange = z.infer<typeof InspectionDiffFindingChangeSchema>;

export const InspectionDiffSchema = z.object({
  currentRunId: z.string().min(1),
  previousRunId: z.string().min(1).nullable(),
  currentScopeId: z.string().min(1).nullable(),
  baseScopeId: z.string().min(1).nullable(),
  currentComparisonScopeKey: z.string().min(1).nullable(),
  baseComparisonScopeKey: z.string().min(1).nullable(),
  representativeVerdictChanged: z.boolean(),
  addedFindingIds: z.array(z.string().min(1)).default([]),
  resolvedFindingIds: z.array(z.string().min(1)).default([]),
  persistedFindingIds: z.array(z.string().min(1)).default([]),
  changedSupportingFindings: z.array(z.string().min(1)).default([]),
  findingChanges: z.array(InspectionDiffFindingChangeSchema).default([])
});
export type InspectionDiff = z.infer<typeof InspectionDiffSchema>;

export const InspectionVerdictDetailSchema = z.object({
  verdictId: VerdictIdSchema,
  verdictKind: VerdictKindSchema,
  category: ViolationCategorySchema,
  explanation: z.string().min(1),
  deterministicVerdict: InspectionDeterministicVerdictSchema,
  evidenceSummary: InspectionEvidenceSummarySchema,
  trace: InspectionTraceFieldsSchema,
  timeline: z.array(InspectionTimelineItemSchema).default([]),
  eventSummaries: z.array(EventEvidenceSummarySchema).default([]),
  stateSummaries: z.array(StateEvidenceSummarySchema).default([]),
  ruleSummaries: z.array(RuleEvidenceSummarySchema).default([]),
  repairs: z.array(InspectionRepairCandidateSchema).default([]),
  advisory: InspectionAdvisorySchema,
  diff: InspectionDiffSchema.nullable(),
  sourceContext: InspectionSourceContextSchema.nullable().optional(),
  createdAt: z.string().min(1)
});
export type InspectionVerdictDetail = z.infer<typeof InspectionVerdictDetailSchema>;

export const InspectionGroupSchema = z.object({
  verdictKind: VerdictKindSchema,
  count: z.number().int().nonnegative(),
  verdicts: z.array(InspectionVerdictSummarySchema).default([])
});
export type InspectionGroup = z.infer<typeof InspectionGroupSchema>;

export const RunInspectionResponseSchema = z.object({
  run: InspectionRunSchema,
  groups: z.array(InspectionGroupSchema),
  selectedVerdictId: z.string().min(1).nullable(),
  detailsByVerdictId: z.record(z.string(), InspectionVerdictDetailSchema),
  diff: InspectionDiffSchema.nullable()
});
export type RunInspectionResponse = z.infer<typeof RunInspectionResponseSchema>;
