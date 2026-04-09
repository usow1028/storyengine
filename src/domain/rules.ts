import { z } from "zod";

import {
  ProvenanceIdSchema,
  RevisionIdSchema,
  RulePackIdSchema,
  RuleVersionIdSchema,
  StoryIdSchema
} from "./ids.js";

export const RuleScopeSchema = z.enum(["global", "story", "location", "character", "event"]);
export type RuleScope = z.infer<typeof RuleScopeSchema>;

export const RuleSourceKindSchema = z.enum(["baseline", "user_authored", "imported", "normalized"]);
export type RuleSourceKind = z.infer<typeof RuleSourceKindSchema>;

export const ExecutableRuleKindSchema = z.enum(["asp", "dsl", "sql", "predicate", "unknown"]);
export type ExecutableRuleKind = z.infer<typeof ExecutableRuleKindSchema>;

export const RulePackMetadataSchema = z.object({
  rulePackId: RulePackIdSchema,
  storyId: StoryIdSchema,
  revisionId: RevisionIdSchema,
  name: z.string().min(1),
  description: z.string().default(""),
  worldAffiliation: z.string().min(1),
  scope: RuleScopeSchema,
  priority: z.number().int(),
  active: z.boolean(),
  sourceKind: RuleSourceKindSchema,
  sourceText: z.string().min(1),
  defaultPhysics: z.boolean().default(false),
  provenanceId: ProvenanceIdSchema.optional()
});
export type RulePackMetadata = z.infer<typeof RulePackMetadataSchema>;

export const NormalizedExecutableRuleSchema = z.object({
  ruleVersionId: RuleVersionIdSchema,
  rulePackId: RulePackIdSchema,
  executableKind: ExecutableRuleKindSchema,
  executableRef: z.string().min(1),
  normalizedText: z.string().min(1),
  conditions: z.array(z.string()).default([]),
  effects: z.array(z.string()).default([]),
  validationStatus: z.enum(["draft", "validated", "rejected"]).default("draft"),
  provenanceId: ProvenanceIdSchema.optional()
});
export type NormalizedExecutableRule = z.infer<typeof NormalizedExecutableRuleSchema>;
