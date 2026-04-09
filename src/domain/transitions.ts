import { z } from "zod";

import {
  EntityIdSchema,
  EventIdSchema,
  ProvenanceIdSchema,
  RevisionIdSchema,
  StoryIdSchema,
  TypedStateAttributeSchema,
  CharacterStateCoreSchema
} from "./index.js";

export const BoundaryPositionSchema = z.enum(["before", "after"]);
export type BoundaryPosition = z.infer<typeof BoundaryPositionSchema>;

export const StoryBoundaryQuerySchema = z.object({
  storyId: StoryIdSchema,
  revisionId: RevisionIdSchema,
  characterId: EntityIdSchema,
  targetEventId: EventIdSchema,
  position: BoundaryPositionSchema
});
export type StoryBoundaryQuery = z.infer<typeof StoryBoundaryQuerySchema>;

export const ReconstructedCharacterStateSchema = z.object({
  storyId: StoryIdSchema,
  revisionId: RevisionIdSchema,
  characterId: EntityIdSchema,
  targetEventId: EventIdSchema,
  position: BoundaryPositionSchema,
  core: CharacterStateCoreSchema,
  extensions: z.array(TypedStateAttributeSchema),
  sourceEventIds: z.array(EventIdSchema).default([]),
  provenanceIds: z.array(ProvenanceIdSchema).default([])
});
export type ReconstructedCharacterState = z.infer<typeof ReconstructedCharacterStateSchema>;
