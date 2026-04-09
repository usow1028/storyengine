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

export const ViolationCategorySchema = z.enum([
  "physical_impossibility",
  "temporal_contradiction",
  "causal_gap",
  "character_state_contradiction",
  "rule_conflict",
  "provenance_gap"
]);
export type ViolationCategory = z.infer<typeof ViolationCategorySchema>;

export const VerdictEvidenceSchema = z.object({
  eventIds: z.array(EventIdSchema).default([]),
  stateBoundaryIds: z.array(StateBoundaryIdSchema).default([]),
  ruleVersionIds: z.array(RuleVersionIdSchema).default([]),
  provenanceIds: z.array(ProvenanceIdSchema).default([])
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
