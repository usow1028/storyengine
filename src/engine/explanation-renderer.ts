import type {
  EventEvidenceSummary,
  MissingPremise,
  RuleEvidenceSummary,
  StateEvidenceSummary
} from "../domain/index.js";
import type { DeterministicExplanationInput } from "./types.js";

const STATE_VALUE_ORDER = [
  "locationId",
  "aliveStatus",
  "knowledge",
  "goals",
  "loyalties",
  "resources",
  "conditions"
] as const;

function formatEventSummary(summary: EventEvidenceSummary): string {
  const parts = [
    summary.eventId,
    `${summary.eventType}@${summary.sequence}`,
    summary.placeId ? `place=${summary.placeId}` : undefined,
    `time=${summary.timeRelation}`,
    summary.abstract ? "abstract" : "concrete"
  ].filter(Boolean);

  return parts.join(", ");
}

function formatStateSummary(summary: StateEvidenceSummary): string {
  const valueParts = STATE_VALUE_ORDER.flatMap((field) => {
    const value = summary.values[field];
    if (value === undefined) {
      return [];
    }

    if (Array.isArray(value)) {
      return `${field}=[${value.join(", ")}]`;
    }

    return `${field}=${String(value)}`;
  });

  const provenanceParts = [
    summary.stateBoundaryId ? `boundary=${summary.stateBoundaryId}` : undefined,
    summary.previousBoundaryId ? `previousBoundary=${summary.previousBoundaryId}` : undefined,
    summary.previousSourceEventId ? `previousChange=${summary.previousSourceEventId}` : undefined
  ].filter(Boolean);

  return [
    summary.characterId,
    `axes=${summary.relevantAxes.join("|") || "none"}`,
    valueParts.join(", "),
    provenanceParts.join(", ")
  ]
    .filter((part) => part.length > 0)
    .join(" | ");
}

function formatRuleSummary(summary: RuleEvidenceSummary): string {
  return [
    summary.ruleVersionId ?? summary.rulePackId,
    `scope=${summary.scope}`,
    summary.scopeTargetId ? `target=${summary.scopeTargetId}` : undefined,
    `world=${summary.worldAffiliation}`,
    `active=${summary.active}`,
    summary.effects.length > 0 ? `effects=[${summary.effects.join(", ")}]` : undefined
  ]
    .filter(Boolean)
    .join(", ");
}

function formatMissingPremise(premise: MissingPremise): string {
  return [
    premise.kind,
    premise.description,
    premise.relatedEventId ? `event=${premise.relatedEventId}` : undefined,
    premise.relatedRuleVersionId ? `rule=${premise.relatedRuleVersionId}` : undefined,
    premise.relatedCharacterId ? `character=${premise.relatedCharacterId}` : undefined
  ]
    .filter(Boolean)
    .join(", ");
}

export function renderDeterministicExplanation(input: DeterministicExplanationInput): string {
  const sections = [
    [
      input.verdictKind,
      input.representativeChecker ? `checker=${input.representativeChecker}` : undefined,
      input.reasonCode ? `reason=${input.reasonCode}` : undefined
    ]
      .filter(Boolean)
      .join(" | ")
  ];

  if (input.evidence.eventSummaries.length > 0) {
    sections.push(
      `Events: ${input.evidence.eventSummaries.map((summary) => formatEventSummary(summary)).join("; ")}`
    );
  }

  if (input.evidence.stateSummaries.length > 0) {
    sections.push(
      `States: ${input.evidence.stateSummaries.map((summary) => formatStateSummary(summary)).join("; ")}`
    );
  }

  if (input.evidence.ruleSummaries.length > 0) {
    sections.push(
      `Rules: ${input.evidence.ruleSummaries.map((summary) => formatRuleSummary(summary)).join("; ")}`
    );
  }

  if (input.evidence.conflictPath.length > 0) {
    sections.push(`Conflict path: ${input.evidence.conflictPath.join(" -> ")}`);
  }

  if (input.evidence.missingPremises.length > 0) {
    sections.push(
      `Missing premises: ${input.evidence.missingPremises.map((premise) => formatMissingPremise(premise)).join("; ")}`
    );
  }

  if (input.evidence.notEvaluated.length > 0) {
    sections.push(
      `Blocked checks: ${input.evidence.notEvaluated
        .map(
          (finding) =>
            `${finding.checker} blocked by ${finding.blockedByChecker}(${finding.blockedByReasonCode})`
        )
        .join("; ")}`
    );
  }

  return sections.join(" ");
}
