import { z } from "zod";

import type { CanonicalEvent, NormalizedExecutableRule, RulePackMetadata } from "../domain/index.js";
import {
  CheckerKindSchema,
  EventIdSchema,
  NotEvaluatedFindingSchema,
  ProvenanceIdSchema,
  StateBoundaryIdSchema,
  SupportingFindingSchema,
  VerdictKindSchema,
  ViolationCategorySchema,
  type NotEvaluatedFinding,
  type SupportingFinding,
  type VerdictKind
} from "../domain/index.js";
import type { CanonicalStoryGraph } from "../storage/index.js";

export const AliveStatusSchema = z.enum(["alive", "dead", "unknown"]);

export const CharacterBoundaryFactsSchema = z.object({
  characterId: z.string().min(1),
  locationId: z.string().min(1).optional(),
  aliveStatus: AliveStatusSchema.optional(),
  knowledge: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  loyalties: z.array(z.string()).default([]),
  resources: z.array(z.string()).default([]),
  conditions: z.array(z.string()).default([]),
  stateBoundaryIds: z.array(StateBoundaryIdSchema).default([]),
  sourceEventIds: z.array(EventIdSchema).default([]),
  provenanceIds: z.array(ProvenanceIdSchema).default([])
});
export type CharacterBoundaryFacts = z.infer<typeof CharacterBoundaryFactsSchema>;

export type CheckerKind = z.infer<typeof CheckerKindSchema>;

export interface ActiveRuleSnapshot {
  metadata: RulePackMetadata;
  version?: NormalizedExecutableRule;
}

export interface EventCheckContext {
  graph: CanonicalStoryGraph;
  event: CanonicalEvent;
  previousEvent?: CanonicalEvent;
  activeRules: ActiveRuleSnapshot[];
  boundaryFactsByCharacterId?: Record<string, CharacterBoundaryFacts>;
}

export const HardConstraintEvaluationSchema = z.object({
  verdictKind: VerdictKindSchema,
  category: ViolationCategorySchema.optional(),
  explanation: z.string().min(1),
  representativeChecker: CheckerKindSchema.optional(),
  reasonCode: z.string().min(1).optional(),
  findings: z.array(SupportingFindingSchema).default([]),
  notEvaluated: z.array(NotEvaluatedFindingSchema).default([])
});
export type HardConstraintEvaluation = z.infer<typeof HardConstraintEvaluationSchema>;

interface FindingInput {
  checker: CheckerKind;
  reasonCode: string;
  category: z.infer<typeof ViolationCategorySchema>;
  verdictKind: VerdictKind;
  explanation: string;
  eventIds?: string[];
  stateBoundaryIds?: string[];
  ruleVersionIds?: string[];
  provenanceIds?: string[];
}

export function buildFinding(input: FindingInput): SupportingFinding {
  return SupportingFindingSchema.parse({
    checker: input.checker,
    reasonCode: input.reasonCode,
    category: input.category,
    verdictKind: input.verdictKind,
    explanation: input.explanation,
    evidence: {
      eventIds: input.eventIds ?? [],
      stateBoundaryIds: input.stateBoundaryIds ?? [],
      ruleVersionIds: input.ruleVersionIds ?? [],
      provenanceIds: input.provenanceIds ?? []
    }
  });
}

export function buildNotEvaluated(
  checker: CheckerKind,
  blockedByChecker: CheckerKind,
  blockedByReasonCode: string,
  explanation: string
): NotEvaluatedFinding {
  return NotEvaluatedFindingSchema.parse({
    checker,
    blockedByChecker,
    blockedByReasonCode,
    explanation
  });
}
