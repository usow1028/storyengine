import { z } from "zod";

import {
  EventIdSchema,
  ProvenanceIdSchema,
  RevisionIdSchema,
  RuleVersionIdSchema,
  StateBoundaryIdSchema,
  StoryIdSchema,
  VerdictIdSchema
} from "./ids.js";

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
