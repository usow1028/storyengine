import { z } from "zod";

type Brand<Kind extends string> = string & { readonly __brand: Kind };

const nonEmptyId = z.string().trim().min(1);

function makeIdSchema<Kind extends string>(kind: Kind) {
  return nonEmptyId.transform((value) => value as Brand<Kind>).describe(kind);
}

export type StoryId = Brand<"StoryId">;
export type RevisionId = Brand<"RevisionId">;
export type EntityId = Brand<"EntityId">;
export type EventId = Brand<"EventId">;
export type RulePackId = Brand<"RulePackId">;
export type RuleVersionId = Brand<"RuleVersionId">;
export type VerdictId = Brand<"VerdictId">;
export type ProvenanceId = Brand<"ProvenanceId">;
export type StateBoundaryId = Brand<"StateBoundaryId">;
export type CausalLinkId = Brand<"CausalLinkId">;

export const StoryIdSchema = makeIdSchema("StoryId");
export const RevisionIdSchema = makeIdSchema("RevisionId");
export const EntityIdSchema = makeIdSchema("EntityId");
export const EventIdSchema = makeIdSchema("EventId");
export const RulePackIdSchema = makeIdSchema("RulePackId");
export const RuleVersionIdSchema = makeIdSchema("RuleVersionId");
export const VerdictIdSchema = makeIdSchema("VerdictId");
export const ProvenanceIdSchema = makeIdSchema("ProvenanceId");
export const StateBoundaryIdSchema = makeIdSchema("StateBoundaryId");
export const CausalLinkIdSchema = makeIdSchema("CausalLinkId");

export function createStoryId(value: string): StoryId {
  return StoryIdSchema.parse(value);
}

export function createRevisionId(value: string): RevisionId {
  return RevisionIdSchema.parse(value);
}

export function createEntityId(value: string): EntityId {
  return EntityIdSchema.parse(value);
}

export function createEventId(value: string): EventId {
  return EventIdSchema.parse(value);
}

export function createRulePackId(value: string): RulePackId {
  return RulePackIdSchema.parse(value);
}

export function createRuleVersionId(value: string): RuleVersionId {
  return RuleVersionIdSchema.parse(value);
}

export function createVerdictId(value: string): VerdictId {
  return VerdictIdSchema.parse(value);
}

export function createProvenanceId(value: string): ProvenanceId {
  return ProvenanceIdSchema.parse(value);
}

export function createStateBoundaryId(value: string): StateBoundaryId {
  return StateBoundaryIdSchema.parse(value);
}

export function createCausalLinkId(value: string): CausalLinkId {
  return CausalLinkIdSchema.parse(value);
}

export const CanonicalIdSchemas = {
  story: StoryIdSchema,
  revision: RevisionIdSchema,
  entity: EntityIdSchema,
  event: EventIdSchema,
  rulePack: RulePackIdSchema,
  ruleVersion: RuleVersionIdSchema,
  verdict: VerdictIdSchema,
  provenance: ProvenanceIdSchema,
  stateBoundary: StateBoundaryIdSchema,
  causalLink: CausalLinkIdSchema
} as const;
