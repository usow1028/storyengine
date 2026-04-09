import { z } from "zod";

import {
  EntityIdSchema,
  RevisionIdSchema,
  StoryIdSchema
} from "./ids.js";

export const EntityKindSchema = z.enum(["character", "place", "object", "world"]);
export type EntityKind = z.infer<typeof EntityKindSchema>;

export const StoryRecordSchema = z.object({
  storyId: StoryIdSchema,
  title: z.string().min(1),
  description: z.string().default(""),
  defaultRulePackName: z.string().min(1).default("reality-default")
});
export type StoryRecord = z.infer<typeof StoryRecordSchema>;

export const StoryRevisionRecordSchema = z.object({
  revisionId: RevisionIdSchema,
  storyId: StoryIdSchema,
  basedOnRevisionId: RevisionIdSchema.optional(),
  sourceKind: z.enum(["manual", "imported", "normalized"]),
  createdAt: z.string().min(1)
});
export type StoryRevisionRecord = z.infer<typeof StoryRevisionRecordSchema>;

const CanonicalEntityBaseSchema = z.object({
  entityId: EntityIdSchema,
  storyId: StoryIdSchema,
  revisionId: RevisionIdSchema,
  entityKind: EntityKindSchema,
  name: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  description: z.string().default("")
});

export const CharacterEntitySchema = CanonicalEntityBaseSchema.extend({
  entityKind: z.literal("character"),
  archetypes: z.array(z.string()).default([]),
  defaultLoyalties: z.array(z.string()).default([])
});
export type CharacterEntity = z.infer<typeof CharacterEntitySchema>;

export const PlaceCoordinatesSchema = z.object({
  lat: z.number(),
  lng: z.number()
});
export type PlaceCoordinates = z.infer<typeof PlaceCoordinatesSchema>;

export const PlaceEntitySchema = CanonicalEntityBaseSchema.extend({
  entityKind: z.literal("place"),
  parentPlaceId: EntityIdSchema.optional(),
  coordinates: PlaceCoordinatesSchema.optional(),
  movementClass: z.enum(["normal", "restricted", "fictional"]).default("normal")
});
export type PlaceEntity = z.infer<typeof PlaceEntitySchema>;

export const ObjectEntitySchema = CanonicalEntityBaseSchema.extend({
  entityKind: z.literal("object"),
  ownerId: EntityIdSchema.optional(),
  portable: z.boolean().default(true)
});
export type ObjectEntity = z.infer<typeof ObjectEntitySchema>;

export const WorldEntitySchema = CanonicalEntityBaseSchema.extend({
  entityKind: z.literal("world"),
  scope: z.enum(["story", "setting", "faction", "system"]).default("setting")
});
export type WorldEntity = z.infer<typeof WorldEntitySchema>;

export const CanonicalEntitySchema = z.discriminatedUnion("entityKind", [
  CharacterEntitySchema,
  PlaceEntitySchema,
  ObjectEntitySchema,
  WorldEntitySchema
]);
export type CanonicalEntity = z.infer<typeof CanonicalEntitySchema>;
