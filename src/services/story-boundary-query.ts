import {
  ReconstructedCharacterStateSchema,
  StoryBoundaryQuerySchema,
  type ReconstructedCharacterState,
  type StoryBoundaryQuery
} from "../domain/index.js";
import { SnapshotRebuilder } from "./snapshot-rebuilder.js";

export interface CharacterBoundaryFacts {
  storyId: string;
  revisionId: string;
  characterId: string;
  targetEventId: string;
  position: "before" | "after";
  locationId?: string;
  knowledge: string[];
  goals: string[];
  loyalties: string[];
  resources: string[];
  conditions: string[];
  provenanceIds: string[];
  sourceEventIds: string[];
}

export class StoryBoundaryQueryService {
  constructor(private readonly snapshotRebuilder: SnapshotRebuilder) {}

  async queryCharacterState(queryInput: StoryBoundaryQuery): Promise<ReconstructedCharacterState> {
    const query = StoryBoundaryQuerySchema.parse(queryInput);
    return ReconstructedCharacterStateSchema.parse(
      await this.snapshotRebuilder.rebuildCharacterSnapshot(query)
    );
  }

  async queryCharacterFacts(queryInput: StoryBoundaryQuery): Promise<CharacterBoundaryFacts> {
    const state = await this.queryCharacterState(queryInput);
    return {
      storyId: state.storyId,
      revisionId: state.revisionId,
      characterId: state.characterId,
      targetEventId: state.targetEventId,
      position: state.position,
      locationId: state.core.locationId,
      knowledge: [...state.core.knowledge],
      goals: [...state.core.goals],
      loyalties: [...state.core.loyalties],
      resources: [...state.core.resources],
      conditions: [...state.core.conditions],
      provenanceIds: [...state.provenanceIds],
      sourceEventIds: [...state.sourceEventIds]
    };
  }
}
