import {
  type AddMissingAssumptionPayload,
  type AddPriorEventPayload,
  type DeclareRulePayload,
  RepairCandidateSchema,
  type RepairCandidate,
  type VerdictEvidence,
  type ViolationCategory,
  type VerdictKind
} from "../domain/index.js";
import { resolveRepairCatalogEntry } from "./repair-catalog.js";
import { assignRepairConfidenceBand, rankRepairCandidates } from "./repair-ranking.js";

export interface RepairSource {
  sourceFindingId: string;
  reasonCode: string;
  category?: ViolationCategory;
  verdictKind?: VerdictKind;
  evidence: VerdictEvidence;
  blocked?: boolean;
}

interface GenerateRepairCandidatesInput {
  sources: RepairSource[];
  maxCandidates?: number;
}

const MAX_DISPLAY_CANDIDATES = 3;

function buildMissingAssumptionCandidate(source: RepairSource): RepairCandidate {
  const premise = source.evidence.missingPremises[0];
  const relatedEventId =
    premise?.relatedEventId ??
    source.evidence.eventSummaries[source.evidence.eventSummaries.length - 1]?.eventId;
  const relatedCharacterId = premise?.relatedCharacterId ?? source.evidence.stateSummaries[0]?.characterId;
  const summary =
    premise?.description ??
    `Add a missing assumption that explains ${relatedEventId ?? "the failing event"}.`;

  return {
    repairId: `repair:${source.sourceFindingId}:add_missing_assumption`,
    repairType: "add_missing_assumption",
    reasonCode: source.reasonCode,
    sourceFindingIds: [source.sourceFindingId],
    confidenceBand: "low",
    summary,
    payload: {
      assumptionText: summary,
      relatedEventId,
      relatedCharacterId
    }
  };
}

function buildPriorEventCandidate(source: RepairSource): RepairCandidate {
  const conflictTail = source.evidence.conflictPath[source.evidence.conflictPath.length - 1];
  const insertBeforeEventId =
    conflictTail ??
    source.evidence.eventSummaries[source.evidence.eventSummaries.length - 1]?.eventId ??
    "event:unknown";
  const anchorEventId =
    source.evidence.conflictPath.length > 1
      ? source.evidence.conflictPath[source.evidence.conflictPath.length - 2]
      : source.evidence.eventSummaries[source.evidence.eventSummaries.length - 2]?.eventId;
  const summary =
    source.reasonCode === "impossible_travel"
      ? `Add a prior departure event before ${insertBeforeEventId}.`
      : `Add a prior causal event before ${insertBeforeEventId}.`;
  const expectedEffect =
    source.reasonCode === "impossible_travel"
      ? `Create enough travel lead time before ${insertBeforeEventId}.`
      : `Introduce a local cause that enables ${insertBeforeEventId}.`;

  return {
    repairId: `repair:${source.sourceFindingId}:add_prior_event`,
    repairType: "add_prior_event",
    reasonCode: source.reasonCode,
    sourceFindingIds: [source.sourceFindingId],
    confidenceBand: "low",
    summary,
    payload: {
      insertBeforeEventId,
      anchorEventId,
      eventType: "explanatory_prior_event",
      summary,
      expectedEffect
    }
  };
}

function buildDeclareRuleCandidate(source: RepairSource): RepairCandidate {
  const eventSummary = source.evidence.eventSummaries[source.evidence.eventSummaries.length - 1];
  const relatedRuleVersionId = source.evidence.ruleSummaries[0]?.ruleVersionId;
  const scope = eventSummary?.eventId ? "event" : "story";
  const scopeTargetId = eventSummary?.eventId;
  const ruleText =
    source.reasonCode === "impossible_travel"
      ? `Declare an event-scoped instant-travel override for ${scopeTargetId ?? "this story"}.`
      : `Declare a local rule override before ${scopeTargetId ?? "this story segment"}.`;
  const expectedEffect =
    source.reasonCode === "impossible_travel"
      ? `Allow the movement exception needed for ${eventSummary?.eventId ?? "the event"}.`
      : `Activate the missing rule dependency before the failing event.`;

  return {
    repairId: `repair:${source.sourceFindingId}:declare_rule`,
    repairType: "declare_rule",
    reasonCode: source.reasonCode,
    sourceFindingIds: [source.sourceFindingId],
    confidenceBand: "low",
    summary: ruleText,
    payload: {
      scope,
      scopeTargetId,
      ruleText,
      relatedRuleVersionId,
      expectedEffect
    }
  };
}

function buildBundleCandidate(source: RepairSource, repairs: RepairCandidate[]): RepairCandidate | undefined {
  const bundleRepairs = repairs.slice(0, 2).flatMap((repair) => {
    if (repair.repairType === "repair_bundle") {
      return [];
    }

    return [
      {
        repairType: repair.repairType,
        summary: repair.summary,
        payload: repair.payload as
          | AddMissingAssumptionPayload
          | AddPriorEventPayload
          | DeclareRulePayload
      }
    ];
  });

  if (bundleRepairs.length < 2) {
    return undefined;
  }

  return {
    repairId: `repair:${source.sourceFindingId}:repair_bundle`,
    repairType: "repair_bundle",
    reasonCode: source.reasonCode,
    sourceFindingIds: [source.sourceFindingId],
    confidenceBand: "low",
    summary: `Combine ${bundleRepairs[0]?.repairType} with ${bundleRepairs[1]?.repairType} for ${source.reasonCode}.`,
    payload: {
      repairs: bundleRepairs
    }
  };
}

function fingerprintCandidate(candidate: RepairCandidate): string {
  return JSON.stringify({
    repairType: candidate.repairType,
    reasonCode: candidate.reasonCode,
    payload: candidate.payload
  });
}

function mergeDuplicateCandidates(candidates: RepairCandidate[]): RepairCandidate[] {
  const merged = new Map<string, RepairCandidate>();

  for (const candidate of candidates) {
    const fingerprint = fingerprintCandidate(candidate);
    const existing = merged.get(fingerprint);
    if (!existing) {
      merged.set(fingerprint, candidate);
      continue;
    }

    existing.sourceFindingIds = [...new Set([...existing.sourceFindingIds, ...candidate.sourceFindingIds])];
  }

  return [...merged.values()];
}

function generateCandidatesForSource(source: RepairSource): RepairCandidate[] {
  if (source.blocked) {
    return [];
  }

  const catalog = resolveRepairCatalogEntry(source.reasonCode, source.category);
  if (!catalog) {
    return [];
  }

  const candidates = catalog.repairTypes
    .filter(
      (
        repairType
      ): repairType is "add_missing_assumption" | "add_prior_event" | "declare_rule" =>
        repairType !== "repair_bundle"
    )
    .map((repairType) => {
      switch (repairType) {
        case "add_missing_assumption":
          return buildMissingAssumptionCandidate(source);
        case "add_prior_event":
          return buildPriorEventCandidate(source);
        case "declare_rule":
          return buildDeclareRuleCandidate(source);
      }
    })
    .filter((candidate): candidate is RepairCandidate => Boolean(candidate));

  if (catalog.bundleCapable && catalog.repairTypes.includes("repair_bundle")) {
    const bundle = buildBundleCandidate(source, candidates);
    if (bundle) {
      candidates.push(bundle);
    }
  }

  return candidates;
}

export function generateRepairCandidates(input: GenerateRepairCandidatesInput): RepairCandidate[] {
  const maxCandidates = input.maxCandidates ?? MAX_DISPLAY_CANDIDATES;
  const merged = mergeDuplicateCandidates(
    input.sources.flatMap((source) => generateCandidatesForSource(source))
  );
  const ranked = rankRepairCandidates(merged).slice(0, Math.min(maxCandidates, 3));

  return ranked.map((candidate) =>
    RepairCandidateSchema.parse({
      ...candidate,
      confidenceBand: assignRepairConfidenceBand(candidate)
    })
  );
}
