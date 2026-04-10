import { z } from "zod";

import {
  EventEvidenceSummarySchema,
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
import { RepairCandidateSchema } from "./repairs.js";
import { RepairPlausibilityAdjustmentSchema, SoftPriorAssessmentSchema } from "./priors.js";

export const VERDICT_KIND_ORDER = [
  "Hard Contradiction",
  "Repairable Gap",
  "Soft Drift",
  "Consistent"
] as const satisfies readonly VerdictKind[];

export const InspectionRepairCandidateSchema = RepairCandidateSchema;
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

export const RunInspectionSnapshotSchema = z.object({
  runId: z.string().min(1),
  createdAt: z.string().min(1),
  repairCandidates: z.array(RepairCandidateSchema).default([]),
  advisory: InspectionAdvisorySchema
});
export type RunInspectionSnapshot = z.infer<typeof RunInspectionSnapshotSchema>;

export const InspectionRunSchema = z.object({
  runId: z.string().min(1),
  storyId: StoryIdSchema,
  revisionId: RevisionIdSchema,
  previousRunId: z.string().min(1).nullable(),
  triggerKind: VerdictRunTriggerKindSchema,
  createdAt: z.string().min(1)
});
export type InspectionRun = z.infer<typeof InspectionRunSchema>;

export const InspectionVerdictSummarySchema = z.object({
  verdictId: VerdictIdSchema,
  verdictKind: VerdictKindSchema,
  category: ViolationCategorySchema,
  explanation: z.string().min(1),
  findingId: z.string().min(1).nullable(),
  reasonCode: z.string().min(1).nullable(),
  eventCount: z.number().int().nonnegative(),
  repairCandidateCount: z.number().int().nonnegative(),
  createdAt: z.string().min(1)
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

export const InspectionVerdictDetailSchema = z.object({
  verdictId: VerdictIdSchema,
  verdictKind: VerdictKindSchema,
  category: ViolationCategorySchema,
  explanation: z.string().min(1),
  trace: InspectionTraceFieldsSchema,
  timeline: z.array(InspectionTimelineItemSchema).default([]),
  eventSummaries: z.array(EventEvidenceSummarySchema).default([]),
  stateSummaries: z.array(StateEvidenceSummarySchema).default([]),
  ruleSummaries: z.array(RuleEvidenceSummarySchema).default([]),
  repairCandidates: z.array(InspectionRepairCandidateSchema).default([]),
  advisory: InspectionAdvisorySchema,
  createdAt: z.string().min(1)
});
export type InspectionVerdictDetail = z.infer<typeof InspectionVerdictDetailSchema>;

export const InspectionGroupSchema = z.object({
  verdictKind: VerdictKindSchema,
  count: z.number().int().nonnegative(),
  verdicts: z.array(InspectionVerdictSummarySchema).default([])
});
export type InspectionGroup = z.infer<typeof InspectionGroupSchema>;

export const InspectionDiffSchema = z.object({
  currentRunId: z.string().min(1),
  previousRunId: z.string().min(1).nullable(),
  representativeVerdictChanged: z.boolean(),
  addedFindingIds: z.array(z.string().min(1)).default([]),
  resolvedFindingIds: z.array(z.string().min(1)).default([]),
  persistedFindingIds: z.array(z.string().min(1)).default([]),
  changedSupportingFindings: z.array(z.string().min(1)).default([])
});
export type InspectionDiff = z.infer<typeof InspectionDiffSchema>;

export const RunInspectionResponseSchema = z.object({
  run: InspectionRunSchema,
  groups: z.array(InspectionGroupSchema),
  selectedVerdictId: z.string().min(1).nullable(),
  detailsByVerdictId: z.record(z.string(), InspectionVerdictDetailSchema),
  diff: InspectionDiffSchema.nullable()
});
export type RunInspectionResponse = z.infer<typeof RunInspectionResponseSchema>;
