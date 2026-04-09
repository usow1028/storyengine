import { z } from "zod";

const nonEmptyId = z.string().trim().min(1);

function makeIdSchema<Kind extends string>(kind: Kind) {
  return nonEmptyId.describe(kind);
}

export type StoryId = string;
export type RevisionId = string;
export type EntityId = string;
export type EventId = string;
export type RulePackId = string;
export type RuleVersionId = string;
export type VerdictId = string;
export type ProvenanceId = string;
export type StateBoundaryId = string;
export type CausalLinkId = string;

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
