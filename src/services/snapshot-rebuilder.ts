import {
  ReconstructedCharacterStateSchema,
  StoryBoundaryQuerySchema,
  type CharacterStateCore,
  type EventStateChange,
  type ReconstructedCharacterState,
  type StoryBoundaryQuery,
  type TypedStateAttribute
} from "../domain/index.js";
import { StoryRepository, type CanonicalStoryGraph } from "../storage/index.js";

function cloneCore(core: CharacterStateCore): CharacterStateCore {
  return {
    locationId: core.locationId,
    aliveStatus: core.aliveStatus,
    knowledge: [...core.knowledge],
    goals: [...core.goals],
    loyalties: [...core.loyalties],
    resources: [...core.resources],
    conditions: [...core.conditions]
  };
}

function cloneExtensions(extensions: TypedStateAttribute[]): TypedStateAttribute[] {
  return extensions.map((extension) => ({
    ...extension,
    value:
      typeof extension.value === "object" && extension.value !== null
        ? JSON.parse(JSON.stringify(extension.value))
        : extension.value
  }));
}

function applyArrayChange(list: string[], change: EventStateChange): string[] {
  const value = String(change.value);
  if (change.operation === "set") {
    return [value];
  }
  if (change.operation === "add") {
    return list.includes(value) ? list : [...list, value];
  }
  return list.filter((item) => item !== value);
}

function applyChange(
  core: CharacterStateCore,
  extensions: TypedStateAttribute[],
  change: EventStateChange
): { core: CharacterStateCore; extensions: TypedStateAttribute[] } {
  switch (change.field) {
    case "locationId":
      return {
        core: {
          ...core,
          locationId: change.operation === "remove" ? undefined : String(change.value)
        },
        extensions
      };
    case "aliveStatus":
      return {
        core: {
          ...core,
          aliveStatus: String(change.value) as CharacterStateCore["aliveStatus"]
        },
        extensions
      };
    case "knowledge":
      return { core: { ...core, knowledge: applyArrayChange(core.knowledge, change) }, extensions };
    case "goals":
      return { core: { ...core, goals: applyArrayChange(core.goals, change) }, extensions };
    case "loyalties":
      return {
        core: { ...core, loyalties: applyArrayChange(core.loyalties, change) },
        extensions
      };
    case "resources":
      return {
        core: { ...core, resources: applyArrayChange(core.resources, change) },
        extensions
      };
    case "conditions":
      return {
        core: { ...core, conditions: applyArrayChange(core.conditions, change) },
        extensions
      };
    default: {
      const nextExtensions = cloneExtensions(extensions);
      const existing = nextExtensions.find((extension) => extension.key === change.field);
      if (existing) {
        existing.value = change.operation === "remove" ? null : change.value;
        if (change.provenanceId) {
          existing.provenanceId = change.provenanceId;
        }
        return { core, extensions: nextExtensions };
      }

      nextExtensions.push({
        key: change.field,
        valueType: typeof change.value === "number" ? "number" : "json",
        value: change.operation === "remove" ? null : change.value,
        provenanceId: change.provenanceId
      });
      return { core, extensions: nextExtensions };
    }
  }
}

function buildInitialState(graph: CanonicalStoryGraph, characterId: string) {
  const boundary = graph.stateBoundaries
    .filter((stateBoundary) => stateBoundary.characterId === characterId)
    .sort((left, right) => left.sequence - right.sequence)[0];

  if (!boundary) {
    throw new Error(`Initial state boundary not found for character ${characterId}`);
  }

  return {
    core: cloneCore(boundary.core),
    extensions: cloneExtensions(boundary.extensions),
    provenanceIds: boundary.provenanceId ? [boundary.provenanceId] : []
  };
}

export class SnapshotRebuilder {
  constructor(private readonly storyRepository: StoryRepository) {}

  async rebuildCharacterSnapshot(queryInput: StoryBoundaryQuery): Promise<ReconstructedCharacterState> {
    const query = StoryBoundaryQuerySchema.parse(queryInput);
    const graph = await this.storyRepository.loadGraph(query.storyId, query.revisionId);
    const targetEvent = graph.events.find((event) => event.eventId === query.targetEventId);

    if (!targetEvent) {
      throw new Error(`Target event not found: ${query.targetEventId}`);
    }

    const base = buildInitialState(graph, query.characterId);
    const core = cloneCore(base.core);
    let extensions = cloneExtensions(base.extensions);
    const provenanceIds = [...base.provenanceIds];
    const sourceEventIds: string[] = [];

    const eventsToApply = graph.events
      .sort((left, right) => left.sequence - right.sequence)
      .filter((event) => {
        if (query.position === "before") {
          return event.sequence < targetEvent.sequence;
        }
        return event.sequence <= targetEvent.sequence;
      });

    for (const event of eventsToApply) {
      let touched = false;
      for (const effect of event.effects) {
        for (const change of effect.stateChanges) {
          if (change.subjectId !== query.characterId) {
            continue;
          }
          const next = applyChange(core, extensions, change);
          Object.assign(core, next.core);
          extensions = next.extensions;
          if (change.provenanceId) {
            provenanceIds.push(change.provenanceId);
          }
          touched = true;
        }
      }
      if (touched) {
        sourceEventIds.push(event.eventId);
      }
    }

    return ReconstructedCharacterStateSchema.parse({
      storyId: query.storyId,
      revisionId: query.revisionId,
      characterId: query.characterId,
      targetEventId: query.targetEventId,
      position: query.position,
      core,
      extensions,
      sourceEventIds,
      provenanceIds
    });
  }
}
