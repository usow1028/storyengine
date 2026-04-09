import {
  buildPriorSnapshots,
  type CorpusWork,
  exportPriorSnapshots,
  normalizeCorpusWork,
  type PriorExportArtifact
} from "../../src/corpus/index.js";
import type { RepairCandidate } from "../../src/domain/index.js";
import type { PriorSnapshotSet, SoftPriorTransitionInput } from "../../src/engine/index.js";
import { buildCorpusPriorFixtures } from "./corpus-prior-fixtures.js";

function cloneWork(work: CorpusWork, suffix: string): CorpusWork {
  return {
    ...structuredClone(work),
    workId: `${work.workId}:${suffix}`,
    title: `${work.title} ${suffix}`
  };
}

export function buildSoftPriorArtifactsFixture(): {
  artifacts: PriorExportArtifact[];
  teleportTransition: SoftPriorTransitionInput;
  oathTransition: SoftPriorTransitionInput;
} {
  const [realityWork, fantasyWork] = buildCorpusPriorFixtures();
  const curatedWorks = [
    realityWork!,
    fantasyWork!,
    cloneWork(fantasyWork!, "copy-01"),
    cloneWork(fantasyWork!, "copy-02"),
    cloneWork(fantasyWork!, "copy-03")
  ];
  const normalizedWorks = curatedWorks.map((work) => normalizeCorpusWork(work));
  const fantasyNormalized = normalizedWorks.find(
    (work) => work.worldProfile === "fantasy-light"
  )!;
  const teleportTransition = fantasyNormalized.transitions[0]!;
  const oathTransition = fantasyNormalized.transitions.find(
    (transition) => transition.nextEventId === "event:oath"
  )!;
  const snapshotVersion = "prior:soft-fixture";
  const builtAt = "2026-04-09T13:00:00Z";
  const snapshots = buildPriorSnapshots({
    normalizedWorks,
    snapshotVersion,
    builtAt
  });

  return {
    artifacts: exportPriorSnapshots({
      snapshots,
      snapshotVersion,
      exportedAt: builtAt
    }),
    teleportTransition: {
      currentEventType: teleportTransition.currentEventType,
      nextEventType: teleportTransition.nextEventType,
      stateAxes: teleportTransition.stateAxes,
      stateTransitionTokens: teleportTransition.stateTransitionTokens,
      worldRuleExceptionTokens: teleportTransition.worldRuleExceptionTokens,
      preconditionTokens: teleportTransition.preconditionTokens,
      genreWeights: teleportTransition.genreWeights,
      worldProfile: teleportTransition.worldProfile
    },
    oathTransition: {
      currentEventType: oathTransition.currentEventType,
      nextEventType: oathTransition.nextEventType,
      stateAxes: oathTransition.stateAxes,
      stateTransitionTokens: oathTransition.stateTransitionTokens,
      worldRuleExceptionTokens: oathTransition.worldRuleExceptionTokens,
      preconditionTokens: oathTransition.preconditionTokens,
      genreWeights: oathTransition.genreWeights,
      worldProfile: oathTransition.worldProfile
    }
  };
}

export function createSparseSnapshotSet(snapshotSet: PriorSnapshotSet): PriorSnapshotSet {
  return {
    ...snapshotSet,
    genreSnapshots: snapshotSet.genreSnapshots.map((snapshot) => ({
      ...snapshot,
      sampleCount: 1,
      positivePatterns: snapshot.positivePatterns.map((pattern) => ({
        ...pattern,
        sampleCount: 1
      })),
      driftPatterns: snapshot.driftPatterns.map((pattern) => ({
        ...pattern,
        sampleCount: 1
      }))
    }))
  };
}

export function buildTeleportRepairs(): RepairCandidate[] {
  return [
    {
      repairId: "repair:teleport:prior-event",
      repairType: "add_prior_event",
      reasonCode: "impossible_travel",
      sourceFindingIds: ["finding:teleport"],
      confidenceBand: "medium",
      summary: "Add a prior departure event before the arrival.",
      payload: {
        insertBeforeEventId: "event:arrival",
        anchorEventId: "event:spell",
        eventType: "explanatory_prior_event",
        summary: "Add a prior departure event before the arrival.",
        expectedEffect: "Create enough lead time before instant_arrival."
      }
    },
    {
      repairId: "repair:teleport:declare-rule",
      repairType: "declare_rule",
      reasonCode: "impossible_travel",
      sourceFindingIds: ["finding:teleport"],
      confidenceBand: "medium",
      summary: "Declare a local teleportation rule override.",
      payload: {
        scope: "event",
        scopeTargetId: "event:arrival",
        ruleText: "Declare a local teleportation rule override.",
        expectedEffect: "Allow the movement exception needed for event:arrival."
      }
    }
  ];
}

export function buildMotivationRepairs(): RepairCandidate[] {
  return [
    {
      repairId: "repair:oath:prior-event",
      repairType: "add_prior_event",
      reasonCode: "missing_causal_link",
      sourceFindingIds: ["finding:oath"],
      confidenceBand: "medium",
      summary: "Add a prior causal event before the oath.",
      payload: {
        insertBeforeEventId: "event:oath",
        anchorEventId: "event:arrival",
        eventType: "explanatory_prior_event",
        summary: "Add a prior causal event before the oath.",
        expectedEffect: "Introduce a local cause that enables event:oath."
      }
    },
    {
      repairId: "repair:oath:assumption",
      repairType: "add_missing_assumption",
      reasonCode: "loyalty_reversal_without_cause",
      sourceFindingIds: ["finding:oath"],
      confidenceBand: "medium",
      summary: "Add a missing assumption explaining the loyalty shift.",
      payload: {
        assumptionText: "Add a missing assumption explaining the loyalty shift.",
        relatedEventId: "event:oath",
        relatedCharacterId: "character:mage"
      }
    }
  ];
}
