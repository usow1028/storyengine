import { z } from "zod";

import {
  EntityIdSchema,
  EventIdSchema,
  ProvenanceIdSchema,
  RevisionIdSchema,
  RulePackIdSchema,
  RuleVersionIdSchema,
  StateBoundaryIdSchema,
  StoryIdSchema,
  VerdictIdSchema
} from "./ids.js";
import { TemporalRelationSchema } from "./events.js";
import { RuleScopeSchema } from "./rules.js";
import { AliveStatusSchema } from "./state.js";

export const VerdictKindSchema = z.enum([
  "Hard Contradiction",
  "Repairable Gap",
  "Soft Drift",
  "Consistent"
]);
export type VerdictKind = z.infer<typeof VerdictKindSchema>;

export const CheckerKindSchema = z.enum(["time", "space", "physics", "causality", "character"]);
export type CheckerKind = z.infer<typeof CheckerKindSchema>;

export const ViolationCategorySchema = z.enum([
  "physical_impossibility",
  "temporal_contradiction",
  "causal_gap",
  "character_state_contradiction",
  "rule_conflict",
  "provenance_gap"
]);
export type ViolationCategory = z.infer<typeof ViolationCategorySchema>;

export const VerdictEvidenceBaseSchema = z.object({
  eventIds: z.array(EventIdSchema).default([]),
  stateBoundaryIds: z.array(StateBoundaryIdSchema).default([]),
  ruleVersionIds: z.array(RuleVersionIdSchema).default([]),
  provenanceIds: z.array(ProvenanceIdSchema).default([])
});
export type VerdictEvidenceBase = z.infer<typeof VerdictEvidenceBaseSchema>;

export const EventEvidenceSummarySchema = z.object({
  eventId: EventIdSchema,
  eventType: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  abstract: z.boolean(),
  placeId: EntityIdSchema.optional(),
  actorIds: z.array(EntityIdSchema).default([]),
  targetIds: z.array(EntityIdSchema).default([]),
  timeRelation: TemporalRelationSchema
});
export type EventEvidenceSummary = z.infer<typeof EventEvidenceSummarySchema>;

export const StateEvidenceValuesSchema = z.object({
  locationId: EntityIdSchema.optional(),
  aliveStatus: AliveStatusSchema.optional(),
  knowledge: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional(),
  loyalties: z.array(z.string()).optional(),
  resources: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional()
});
export type StateEvidenceValues = z.infer<typeof StateEvidenceValuesSchema>;

export const StateEvidenceSummarySchema = z.object({
  characterId: EntityIdSchema,
  stateBoundaryId: StateBoundaryIdSchema.optional(),
  previousBoundaryId: StateBoundaryIdSchema.optional(),
  previousSourceEventId: EventIdSchema.optional(),
  relevantAxes: z.array(z.string().min(1)).default([]),
  values: StateEvidenceValuesSchema
});
export type StateEvidenceSummary = z.infer<typeof StateEvidenceSummarySchema>;

export const RuleEvidenceSummarySchema = z.object({
  rulePackId: RulePackIdSchema,
  ruleVersionId: RuleVersionIdSchema.optional(),
  name: z.string().min(1),
  scope: RuleScopeSchema,
  scopeTargetId: z.union([EntityIdSchema, EventIdSchema]).optional(),
  worldAffiliation: z.string().min(1),
  active: z.boolean(),
  effects: z.array(z.string()).default([])
});
export type RuleEvidenceSummary = z.infer<typeof RuleEvidenceSummarySchema>;

export const MissingPremiseSchema = z.object({
  kind: z.enum([
    "missing_assumption",
    "missing_rule",
    "missing_prior_event",
    "missing_context",
    "missing_anchor"
  ]),
  description: z.string().min(1),
  relatedEventId: EventIdSchema.optional(),
  relatedRuleVersionId: RuleVersionIdSchema.optional(),
  relatedCharacterId: EntityIdSchema.optional()
});
export type MissingPremise = z.infer<typeof MissingPremiseSchema>;

export const SupportingFindingSchema = z.object({
  checker: CheckerKindSchema,
  reasonCode: z.string().min(1),
  category: ViolationCategorySchema,
  verdictKind: VerdictKindSchema,
  explanation: z.string().min(1),
  evidence: VerdictEvidenceBaseSchema
});
export type SupportingFinding = z.infer<typeof SupportingFindingSchema>;

export const NotEvaluatedFindingSchema = z.object({
  checker: CheckerKindSchema,
  blockedByChecker: CheckerKindSchema,
  blockedByReasonCode: z.string().min(1),
  explanation: z.string().min(1)
});
export type NotEvaluatedFinding = z.infer<typeof NotEvaluatedFindingSchema>;

export const VerdictEvidenceSchema = VerdictEvidenceBaseSchema.extend({
  representativeChecker: CheckerKindSchema.optional(),
  reasonCode: z.string().min(1).optional(),
  eventSummaries: z.array(EventEvidenceSummarySchema).default([]),
  stateSummaries: z.array(StateEvidenceSummarySchema).default([]),
  ruleSummaries: z.array(RuleEvidenceSummarySchema).default([]),
  conflictPath: z.array(z.string().min(1)).default([]),
  missingPremises: z.array(MissingPremiseSchema).default([]),
  supportingFindings: z.array(SupportingFindingSchema).default([]),
  notEvaluated: z.array(NotEvaluatedFindingSchema).default([])
});
export type VerdictEvidence = z.infer<typeof VerdictEvidenceSchema>;

export const VerdictRecordSchema = z.object({
  verdictId: VerdictIdSchema,
  storyId: StoryIdSchema,
  revisionId: RevisionIdSchema,
  verdictKind: VerdictKindSchema,
  category: ViolationCategorySchema,
  explanation: z.string().min(1),
  evidence: VerdictEvidenceSchema,
  createdAt: z.string().min(1)
});
export type VerdictRecord = z.infer<typeof VerdictRecordSchema>;
