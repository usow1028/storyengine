import { z } from "zod";

import {
  CorpusWorkSchema as CorpusWorkMetadataSchema,
  GenreWeightSchema,
  WorldProfileSchema
} from "../domain/priors.js";
import { TemporalRelationSchema } from "../domain/events.js";

export const CorpusStateAxisSchema = z.enum([
  "locationId",
  "aliveStatus",
  "knowledge",
  "goals",
  "loyalties",
  "resources",
  "conditions"
]);
export type CorpusStateAxis = z.infer<typeof CorpusStateAxisSchema>;

export const CorpusStateTransitionSchema = z.object({
  characterId: z.string().min(1),
  axis: CorpusStateAxisSchema,
  operation: z.enum(["set", "add", "remove"]),
  fromValue: z.string().optional(),
  toValue: z.string().optional(),
  value: z.string().optional(),
  summary: z.string().min(1).optional()
});
export type CorpusStateTransition = z.infer<typeof CorpusStateTransitionSchema>;

export const CorpusRuleExceptionSchema = z.object({
  token: z.string().min(1),
  summary: z.string().min(1)
});
export type CorpusRuleException = z.infer<typeof CorpusRuleExceptionSchema>;

export const CorpusEventRowSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  abstract: z.boolean().default(false),
  actorIds: z.array(z.string().min(1)).default([]),
  targetIds: z.array(z.string().min(1)).default([]),
  placeId: z.string().optional(),
  timeRelation: TemporalRelationSchema.default("unknown"),
  minTravelMinutes: z.number().int().nonnegative().optional(),
  preconditionTokens: z.array(z.string().min(1)).default([]),
  stateTransitions: z.array(CorpusStateTransitionSchema).default([]),
  worldRuleExceptions: z.array(CorpusRuleExceptionSchema).default([])
});
export type CorpusEventRow = z.infer<typeof CorpusEventRowSchema>;

export const CorpusSceneSchema = z.object({
  sceneId: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  summary: z.string().default(""),
  eventRows: z.array(CorpusEventRowSchema).min(1)
});
export type CorpusScene = z.infer<typeof CorpusSceneSchema>;

export const CorpusWorkSchema = CorpusWorkMetadataSchema.extend({
  genreWeights: z.array(GenreWeightSchema).min(1),
  worldProfile: WorldProfileSchema,
  scenes: z.array(CorpusSceneSchema).min(1)
});
export type CorpusWork = z.infer<typeof CorpusWorkSchema>;
