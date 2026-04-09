import { z } from "zod";

import {
  EntityIdSchema,
  EventIdSchema,
  RuleVersionIdSchema
} from "./ids.js";
import { RuleScopeSchema } from "./rules.js";

export const RepairTypeSchema = z.enum([
  "add_missing_assumption",
  "add_prior_event",
  "declare_rule",
  "repair_bundle"
]);
export type RepairType = z.infer<typeof RepairTypeSchema>;

export const RepairConfidenceBandSchema = z.enum(["high", "medium", "low"]);
export type RepairConfidenceBand = z.infer<typeof RepairConfidenceBandSchema>;

export const AddMissingAssumptionPayloadSchema = z.object({
  assumptionText: z.string().min(1),
  relatedEventId: EventIdSchema.optional(),
  relatedCharacterId: EntityIdSchema.optional()
});
export type AddMissingAssumptionPayload = z.infer<typeof AddMissingAssumptionPayloadSchema>;

export const AddPriorEventPayloadSchema = z.object({
  insertBeforeEventId: EventIdSchema,
  anchorEventId: EventIdSchema.optional(),
  eventType: z.string().min(1),
  summary: z.string().min(1),
  expectedEffect: z.string().min(1)
});
export type AddPriorEventPayload = z.infer<typeof AddPriorEventPayloadSchema>;

export const DeclareRulePayloadSchema = z.object({
  scope: RuleScopeSchema,
  scopeTargetId: z.union([EntityIdSchema, EventIdSchema]).optional(),
  ruleText: z.string().min(1),
  relatedRuleVersionId: RuleVersionIdSchema.optional(),
  expectedEffect: z.string().min(1)
});
export type DeclareRulePayload = z.infer<typeof DeclareRulePayloadSchema>;

const BundleRepairTypeSchema = z.enum([
  "add_missing_assumption",
  "add_prior_event",
  "declare_rule"
]);

export const RepairBundleItemSchema = z.object({
  repairType: BundleRepairTypeSchema,
  summary: z.string().min(1),
  payload: z.union([
    AddMissingAssumptionPayloadSchema,
    AddPriorEventPayloadSchema,
    DeclareRulePayloadSchema
  ])
});
export type RepairBundleItem = z.infer<typeof RepairBundleItemSchema>;

export const RepairBundleSchema = z.object({
  repairs: z.array(RepairBundleItemSchema).min(2).max(2)
});
export type RepairBundle = z.infer<typeof RepairBundleSchema>;

export const RepairPayloadSchema = z.union([
  AddMissingAssumptionPayloadSchema,
  AddPriorEventPayloadSchema,
  DeclareRulePayloadSchema,
  RepairBundleSchema
]);
export type RepairPayload = z.infer<typeof RepairPayloadSchema>;

export const RepairCandidateSchema = z.object({
  repairId: z.string().min(1),
  repairType: RepairTypeSchema,
  reasonCode: z.string().min(1),
  sourceFindingIds: z.array(z.string().min(1)).default([]),
  confidenceBand: RepairConfidenceBandSchema,
  summary: z.string().min(1),
  payload: RepairPayloadSchema
});
export type RepairCandidate = z.infer<typeof RepairCandidateSchema>;
