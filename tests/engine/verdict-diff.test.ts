import { beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import {
  applyCanonicalSchema,
  StoryRepository,
  VerdictRepository,
  VerdictRunRepository
} from "../../src/storage/index.js";
import { diffAgainstPreviousRun } from "../../src/services/index.js";
import { buildImpossibleTravelFixture } from "../fixtures/hard-constraint-fixtures.js";

function createTestClient() {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  return { pool };
}

async function seedStory(pool: Pool) {
  const fixture = buildImpossibleTravelFixture();
  const storyRepository = new StoryRepository(pool);
  await storyRepository.saveGraph(fixture.graph);
  return fixture;
}

describe("verdict diff", () => {
  let pool: Pool;

  beforeEach(async () => {
    const created = createTestClient();
    pool = created.pool;
    await applyCanonicalSchema(pool);
  });

  it("compares only to the immediately previous run", async () => {
    const fixture = await seedStory(pool);
    const verdictRepository = new VerdictRepository(pool);
    const verdictRunRepository = new VerdictRunRepository(pool);

    await verdictRunRepository.saveRun({
      runId: "run:1",
      storyId: fixture.graph.story.storyId,
      revisionId: fixture.graph.revision.revisionId,
      triggerKind: "test",
      createdAt: "2026-04-09T12:00:00Z"
    });
    await verdictRepository.saveVerdict({
      verdictId: "verdict:1",
      runId: "run:1",
      storyId: fixture.graph.story.storyId,
      revisionId: fixture.graph.revision.revisionId,
      verdictKind: "Hard Contradiction",
      category: "temporal_contradiction",
      explanation: "first run",
      evidence: {
        findingId: "finding:shared-hard",
        eventIds: ["event:airport", "event:meeting"],
        stateBoundaryIds: [],
        ruleVersionIds: [],
        provenanceIds: [],
        representativeChecker: "time",
        reasonCode: "impossible_travel",
        eventSummaries: [],
        stateSummaries: [],
        ruleSummaries: [],
        conflictPath: ["event:airport", "event:meeting"],
        missingPremises: [],
        supportingFindings: [],
        notEvaluated: []
      },
      createdAt: "2026-04-09T12:00:00Z"
    });

    await verdictRunRepository.saveRun({
      runId: "run:2",
      storyId: fixture.graph.story.storyId,
      revisionId: fixture.graph.revision.revisionId,
      previousRunId: "run:1",
      triggerKind: "test",
      createdAt: "2026-04-09T12:05:00Z"
    });
    await verdictRepository.saveVerdict({
      verdictId: "verdict:2",
      runId: "run:2",
      storyId: fixture.graph.story.storyId,
      revisionId: fixture.graph.revision.revisionId,
      verdictKind: "Consistent",
      category: "provenance_gap",
      explanation: "second run",
      evidence: {
        findingId: "finding:consistent",
        eventIds: ["event:meeting"],
        stateBoundaryIds: [],
        ruleVersionIds: [],
        provenanceIds: [],
        representativeChecker: undefined,
        reasonCode: undefined,
        eventSummaries: [],
        stateSummaries: [],
        ruleSummaries: [],
        conflictPath: ["event:meeting"],
        missingPremises: [],
        supportingFindings: [],
        notEvaluated: []
      },
      createdAt: "2026-04-09T12:05:00Z"
    });

    await verdictRunRepository.saveRun({
      runId: "run:3",
      storyId: fixture.graph.story.storyId,
      revisionId: fixture.graph.revision.revisionId,
      previousRunId: "run:2",
      triggerKind: "test",
      createdAt: "2026-04-09T12:10:00Z"
    });
    await verdictRepository.saveVerdict({
      verdictId: "verdict:3",
      runId: "run:3",
      storyId: fixture.graph.story.storyId,
      revisionId: fixture.graph.revision.revisionId,
      verdictKind: "Hard Contradiction",
      category: "temporal_contradiction",
      explanation: "third run",
      evidence: {
        findingId: "finding:shared-hard",
        eventIds: ["event:airport", "event:meeting"],
        stateBoundaryIds: [],
        ruleVersionIds: [],
        provenanceIds: [],
        representativeChecker: "time",
        reasonCode: "impossible_travel",
        eventSummaries: [],
        stateSummaries: [],
        ruleSummaries: [],
        conflictPath: ["event:airport", "event:meeting"],
        missingPremises: [],
        supportingFindings: [],
        notEvaluated: []
      },
      createdAt: "2026-04-09T12:10:00Z"
    });

    const diff = await diffAgainstPreviousRun({
      currentRunId: "run:3",
      verdictRepository,
      verdictRunRepository
    });

    expect(diff.previousRunId).toBe("run:2");
    expect(diff.representativeVerdictChanged).toBe(true);
    expect(diff.addedFindingIds).toContain("finding:shared-hard");
    expect(diff.resolvedFindingIds).toContain("finding:consistent");
    expect(diff.persistedFindingIds).toEqual([]);
  });

  it("reports representativeVerdictChanged and changed supporting findings when the finding id persists", async () => {
    const fixture = await seedStory(pool);
    const verdictRepository = new VerdictRepository(pool);
    const verdictRunRepository = new VerdictRunRepository(pool);

    await verdictRunRepository.saveRun({
      runId: "run:alpha",
      storyId: fixture.graph.story.storyId,
      revisionId: fixture.graph.revision.revisionId,
      triggerKind: "test",
      createdAt: "2026-04-09T12:15:00Z"
    });
    await verdictRepository.saveVerdict({
      verdictId: "verdict:alpha",
      runId: "run:alpha",
      storyId: fixture.graph.story.storyId,
      revisionId: fixture.graph.revision.revisionId,
      verdictKind: "Repairable Gap",
      category: "causal_gap",
      explanation: "alpha",
      evidence: {
        findingId: "finding:stable",
        eventIds: ["event:meeting"],
        stateBoundaryIds: [],
        ruleVersionIds: [],
        provenanceIds: [],
        representativeChecker: "causality",
        reasonCode: "missing_causal_link",
        eventSummaries: [],
        stateSummaries: [],
        ruleSummaries: [],
        conflictPath: ["event:meeting"],
        missingPremises: [],
        supportingFindings: [],
        notEvaluated: []
      },
      createdAt: "2026-04-09T12:15:00Z"
    });

    await verdictRunRepository.saveRun({
      runId: "run:beta",
      storyId: fixture.graph.story.storyId,
      revisionId: fixture.graph.revision.revisionId,
      previousRunId: "run:alpha",
      triggerKind: "test",
      createdAt: "2026-04-09T12:20:00Z"
    });
    await verdictRepository.saveVerdict({
      verdictId: "verdict:beta",
      runId: "run:beta",
      storyId: fixture.graph.story.storyId,
      revisionId: fixture.graph.revision.revisionId,
      verdictKind: "Repairable Gap",
      category: "causal_gap",
      explanation: "beta",
      evidence: {
        findingId: "finding:stable",
        eventIds: ["event:meeting"],
        stateBoundaryIds: [],
        ruleVersionIds: [],
        provenanceIds: [],
        representativeChecker: "causality",
        reasonCode: "missing_causal_link",
        eventSummaries: [],
        stateSummaries: [],
        ruleSummaries: [],
        conflictPath: ["event:meeting"],
        missingPremises: [],
        supportingFindings: [
          {
            checker: "character",
            reasonCode: "loyalty_reversal_without_cause",
            category: "character_state_contradiction",
            verdictKind: "Hard Contradiction",
            explanation: "supporting finding changed",
            evidence: {
              eventIds: ["event:meeting"],
              stateBoundaryIds: [],
              ruleVersionIds: [],
              provenanceIds: []
            }
          }
        ],
        notEvaluated: []
      },
      createdAt: "2026-04-09T12:20:00Z"
    });

    const diff = await diffAgainstPreviousRun({
      currentRunId: "run:beta",
      verdictRepository,
      verdictRunRepository
    });

    expect(diff.previousRunId).toBe("run:alpha");
    expect(diff.representativeVerdictChanged).toBe(false);
    expect(diff.persistedFindingIds).toContain("finding:stable");
    expect(diff.changedSupportingFindings).toContain("finding:stable");
  });
});
