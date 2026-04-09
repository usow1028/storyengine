import { z } from "zod";

import {
  EntityIdSchema,
  EventIdSchema,
  ProvenanceIdSchema,
  RevisionIdSchema,
  StateBoundaryIdSchema,
  StoryIdSchema
} from "./ids.js";

export const AliveStatusSchema = z.enum(["alive", "dead", "unknown"]);
export type AliveStatus = z.infer<typeof AliveStatusSchema>;

export const TypedAttributeValueTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "string_array",
  "entity_ref",
  "entity_ref_array",
  "enum",
  "json"
]);
export type TypedAttributeValueType = z.infer<typeof TypedAttributeValueTypeSchema>;

export const TypedStateAttributeSchema = z.object({
  key: z.string().min(1),
  valueType: TypedAttributeValueTypeSchema,
  value: z.unknown(),
  provenanceId: ProvenanceIdSchema.optional()
});
export type TypedStateAttribute = z.infer<typeof TypedStateAttributeSchema>;

export const CharacterStateCoreSchema = z.object({
  locationId: EntityIdSchema.optional(),
  aliveStatus: AliveStatusSchema,
  knowledge: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  loyalties: z.array(z.string()).default([]),
  resources: z.array(z.string()).default([]),
  conditions: z.array(z.string()).default([])
});
export type CharacterStateCore = z.infer<typeof CharacterStateCoreSchema>;

export const BoundaryKindSchema = z.enum(["initial", "before_event", "after_event", "snapshot"]);
export type BoundaryKind = z.infer<typeof BoundaryKindSchema>;

export const CharacterStateBoundarySchema = z.object({
  boundaryId: StateBoundaryIdSchema,
  storyId: StoryIdSchema,
  revisionId: RevisionIdSchema,
  characterId: EntityIdSchema,
  sequence: z.number().int().nonnegative(),
  boundaryKind: BoundaryKindSchema,
  anchorEventId: EventIdSchema.optional(),
  core: CharacterStateCoreSchema,
  extensions: z.array(TypedStateAttributeSchema).default([]),
  provenanceId: ProvenanceIdSchema.optional()
});
export type CharacterStateBoundary = z.infer<typeof CharacterStateBoundarySchema>;
