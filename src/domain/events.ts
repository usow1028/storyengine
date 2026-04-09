import { z } from "zod";

import {
  CausalLinkIdSchema,
  EntityIdSchema,
  EventIdSchema,
  ProvenanceIdSchema,
  RevisionIdSchema,
  RuleVersionIdSchema,
  StoryIdSchema
} from "./ids.js";

export const TemporalRelationSchema = z.enum(["before", "after", "during", "same-window", "unknown"]);
export type TemporalRelation = z.infer<typeof TemporalRelationSchema>;

export const EventTimeSchema = z.object({
  relation: TemporalRelationSchema,
  anchorEventId: EventIdSchema.optional(),
  absoluteTimestamp: z.string().optional(),
  durationMinutes: z.number().int().nonnegative().optional(),
  minTravelMinutes: z.number().int().nonnegative().optional()
});
export type EventTime = z.infer<typeof EventTimeSchema>;

export const EventPreconditionSchema = z.object({
  description: z.string().min(1),
  actorId: EntityIdSchema.optional(),
  requiredRuleVersionId: RuleVersionIdSchema.optional()
});
export type EventPrecondition = z.infer<typeof EventPreconditionSchema>;

export const StateChangeOperationSchema = z.enum(["set", "add", "remove"]);
export type StateChangeOperation = z.infer<typeof StateChangeOperationSchema>;

export const EventStateChangeSchema = z.object({
  subjectId: EntityIdSchema,
  field: z.string().min(1),
  operation: StateChangeOperationSchema,
  value: z.unknown(),
  provenanceId: ProvenanceIdSchema.optional()
});
export type EventStateChange = z.infer<typeof EventStateChangeSchema>;

export const EventRuleChangeSchema = z.object({
  ruleVersionId: RuleVersionIdSchema,
  operation: z.enum(["activate", "deactivate", "override", "declare"]),
  provenanceId: ProvenanceIdSchema.optional()
});
export type EventRuleChange = z.infer<typeof EventRuleChangeSchema>;

export const EventEffectSchema = z.object({
  effectId: z.string().min(1),
  description: z.string().default(""),
  stateChanges: z.array(EventStateChangeSchema).default([]),
  ruleChanges: z.array(EventRuleChangeSchema).default([]),
  provenanceId: ProvenanceIdSchema.optional()
});
export type EventEffect = z.infer<typeof EventEffectSchema>;

export const CausalLinkSchema = z.object({
  linkId: CausalLinkIdSchema,
  storyId: StoryIdSchema,
  revisionId: RevisionIdSchema,
  causeEventId: EventIdSchema,
  effectEventId: EventIdSchema,
  relation: z.enum(["enables", "causes", "motivates", "reveals", "blocks", "restores"])
});
export type CausalLink = z.infer<typeof CausalLinkSchema>;

export const CanonicalEventSchema = z.object({
  eventId: EventIdSchema,
  storyId: StoryIdSchema,
  revisionId: RevisionIdSchema,
  eventType: z.string().min(1),
  abstract: z.boolean().default(false),
  actorIds: z.array(EntityIdSchema).min(1),
  targetIds: z.array(EntityIdSchema).default([]),
  sequence: z.number().int().nonnegative(),
  time: EventTimeSchema,
  placeId: EntityIdSchema.optional(),
  preconditions: z.array(EventPreconditionSchema).default([]),
  effects: z.array(EventEffectSchema).default([]),
  causalLinkIds: z.array(CausalLinkIdSchema).default([]),
  provenanceId: ProvenanceIdSchema.optional()
}).superRefine((value, ctx) => {
  const changes = value.effects.flatMap((effect) => [
    ...effect.stateChanges,
    ...effect.ruleChanges
  ]);

  if (changes.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Canonical events must connect to at least one state change or rule change.",
      path: ["effects"]
    });
  }
});
export type CanonicalEvent = z.infer<typeof CanonicalEventSchema>;
