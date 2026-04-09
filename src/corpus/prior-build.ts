import {
  createDriftPatternKey,
  createPriorArtifactFilename,
  createPriorSnapshotId,
  createTransitionPatternKey,
  DriftPatternSchema,
  type GenreWeight,
  type NormalizedCorpusTransition,
  type NormalizedCorpusWork,
  NormalizedTransitionPatternSchema,
  PriorSnapshotArtifactSchema,
  PriorSnapshotSchema,
  type PriorLayer,
  type PriorSnapshot,
  type PriorSnapshotArtifact,
  type WorldProfile
} from "../domain/priors.js";

interface BuildPriorSnapshotsInput {
  normalizedWorks: NormalizedCorpusWork[];
  snapshotVersion: string;
  builtAt?: string;
}

interface ExportPriorSnapshotsInput {
  snapshots: PriorSnapshot[];
  snapshotVersion: string;
  exportedAt?: string;
}

export interface PriorExportArtifact {
  filename: string;
  artifact: PriorSnapshotArtifact;
}

interface AggregateGroup {
  layer: PriorLayer;
  genreKey: string;
  worldProfile: WorldProfile;
  genreWeights: GenreWeight[];
  sourceWorkIds: Set<string>;
  sampleCount: number;
  positivePatterns: Map<string, ReturnType<typeof NormalizedTransitionPatternSchema.parse>>;
  driftPatterns: Map<string, ReturnType<typeof DriftPatternSchema.parse>>;
}

interface DriftSeed {
  driftType: string;
  triggerTokens: string[];
}

const MOTIVATION_AXES = new Set(["knowledge", "goals", "loyalties", "conditions"]);

function createGroup(
  layer: PriorLayer,
  genreKey: string,
  worldProfile: WorldProfile,
  genreWeights: GenreWeight[]
): AggregateGroup {
  return {
    layer,
    genreKey,
    worldProfile,
    genreWeights,
    sourceWorkIds: new Set<string>(),
    sampleCount: 0,
    positivePatterns: new Map(),
    driftPatterns: new Map()
  };
}

function patternSummary(transition: NormalizedCorpusTransition): string {
  return transition.representativePatternSummary;
}

function inferDriftSeeds(transition: NormalizedCorpusTransition): DriftSeed[] {
  const seeds: DriftSeed[] = [];
  const motivationAxes = transition.stateAxes.filter((axis) => MOTIVATION_AXES.has(axis));

  if (transition.preconditionTokens.length > 0) {
    seeds.push({
      driftType: "transition_drift",
      triggerTokens: transition.preconditionTokens
    });
  }

  if (motivationAxes.length > 0) {
    seeds.push({
      driftType: "motivation_drift",
      triggerTokens: motivationAxes
    });
  }

  if (transition.worldRuleExceptionTokens.length > 0) {
    seeds.push({
      driftType: "rule_exception_rarity",
      triggerTokens: transition.worldRuleExceptionTokens
    });
  }

  return seeds;
}

function addPositivePattern(group: AggregateGroup, transition: NormalizedCorpusTransition) {
  const patternKey = createTransitionPatternKey(transition);
  const existing = group.positivePatterns.get(patternKey);
  if (existing) {
    existing.sampleCount += 1;
    existing.sourceWorkIds = [...new Set([...existing.sourceWorkIds, transition.workId])];
    return;
  }

  group.positivePatterns.set(
    patternKey,
    NormalizedTransitionPatternSchema.parse({
      patternKey,
      currentEventType: transition.currentEventType,
      nextEventType: transition.nextEventType,
      stateAxes: transition.stateAxes,
      stateTransitionTokens: transition.stateTransitionTokens,
      worldRuleExceptionTokens: transition.worldRuleExceptionTokens,
      preconditionTokens: transition.preconditionTokens,
      representativePatternSummary: patternSummary(transition),
      sampleCount: 1,
      sourceWorkIds: [transition.workId]
    })
  );
}

function addDriftPattern(group: AggregateGroup, transition: NormalizedCorpusTransition) {
  for (const seed of inferDriftSeeds(transition)) {
    const patternKey = createDriftPatternKey({
      driftType: seed.driftType,
      currentEventType: transition.currentEventType,
      nextEventType: transition.nextEventType,
      triggerTokens: seed.triggerTokens
    });
    const existing = group.driftPatterns.get(patternKey);
    if (existing) {
      existing.sampleCount += 1;
      existing.sourceWorkIds = [...new Set([...existing.sourceWorkIds, transition.workId])];
      return;
    }

    group.driftPatterns.set(
      patternKey,
      DriftPatternSchema.parse({
        patternKey,
        driftType: seed.driftType,
        currentEventType: transition.currentEventType,
        nextEventType: transition.nextEventType,
        stateAxes: transition.stateAxes,
        triggerTokens: seed.triggerTokens,
        representativePatternSummary: patternSummary(transition),
        sampleCount: 1,
        sourceWorkIds: [transition.workId]
      })
    );
  }
}

function applyTransition(group: AggregateGroup, transition: NormalizedCorpusTransition) {
  group.sampleCount += 1;
  group.sourceWorkIds.add(transition.workId);
  addPositivePattern(group, transition);
  addDriftPattern(group, transition);
}

export function buildPriorSnapshots(input: BuildPriorSnapshotsInput): PriorSnapshot[] {
  const builtAt = input.builtAt ?? new Date().toISOString();
  const groups = new Map<string, AggregateGroup>();

  for (const work of input.normalizedWorks) {
    const baselineGroupKey = `baseline::${work.worldProfile}`;
    const baselineGroup =
      groups.get(baselineGroupKey) ??
      createGroup("baseline", "baseline", work.worldProfile, []);
    groups.set(baselineGroupKey, baselineGroup);

    const genreGroupKey = `genre::${work.genreKey}::${work.worldProfile}`;
    const genreGroup =
      groups.get(genreGroupKey) ??
      createGroup("genre", work.genreKey, work.worldProfile, work.genreWeights);
    groups.set(genreGroupKey, genreGroup);

    for (const transition of work.transitions) {
      applyTransition(baselineGroup, transition);
      applyTransition(genreGroup, transition);
    }
  }

  return [...groups.values()]
    .filter((group) => group.sampleCount > 0)
    .map((group) =>
      PriorSnapshotSchema.parse({
        snapshotId: createPriorSnapshotId({
          snapshotVersion: input.snapshotVersion,
          layer: group.layer,
          genreKey: group.genreKey,
          worldProfile: group.worldProfile
        }),
        layer: group.layer,
        genreKey: group.genreKey,
        worldProfile: group.worldProfile,
        sampleCount: group.sampleCount,
        builtAt,
        sourceWorkIds: [...group.sourceWorkIds].sort(),
        positivePatterns: [...group.positivePatterns.values()].sort((left, right) =>
          left.patternKey.localeCompare(right.patternKey)
        ),
        driftPatterns: [...group.driftPatterns.values()].sort((left, right) =>
          left.patternKey.localeCompare(right.patternKey)
        ),
        genreWeights: group.genreWeights
      })
    )
    .sort((left, right) =>
      left.layer.localeCompare(right.layer) ||
      left.genreKey.localeCompare(right.genreKey) ||
      left.worldProfile.localeCompare(right.worldProfile)
    );
}

export function exportPriorSnapshots(input: ExportPriorSnapshotsInput): PriorExportArtifact[] {
  const exportedAt = input.exportedAt ?? new Date().toISOString();
  const grouped = new Map<string, PriorSnapshot[]>();

  for (const snapshot of input.snapshots) {
    const filename = createPriorArtifactFilename(
      snapshot.layer,
      snapshot.layer === "genre" ? snapshot.genreKey : undefined
    );
    const snapshots = grouped.get(filename) ?? [];
    snapshots.push(snapshot);
    grouped.set(filename, snapshots);
  }

  return [...grouped.entries()]
    .map(([filename, snapshots]) => {
      const layer = snapshots[0]?.layer ?? "baseline";
      const artifact = PriorSnapshotArtifactSchema.parse({
        snapshotVersion: input.snapshotVersion,
        layer,
        exportedAt,
        snapshots: snapshots.sort((left, right) =>
          left.worldProfile.localeCompare(right.worldProfile)
        )
      });

      return {
        filename,
        artifact
      } satisfies PriorExportArtifact;
    })
    .sort((left, right) => left.filename.localeCompare(right.filename));
}
