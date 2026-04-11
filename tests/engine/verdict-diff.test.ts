import { beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import {
  applyCanonicalSchema,
  StoryRepository,
  VerdictRepository,
  VerdictRunRepository
} from "../../src/storage/index.js";
import { diffAgainstPreviousRun, diffVerdictRuns } from "../../src/services/index.js";
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

async function saveRevision(
  pool: Pool,
  input: { storyId: string; revisionId: string; createdAt: string }
) {
  await pool.query(
    `
      INSERT INTO story_revisions (revision_id, story_id, source_kind, created_at)
      VALUES ($1, $2, $3, $4)
    `,
    [input.revisionId, input.storyId, "manual", input.createdAt]
  );
}

function fullScope(input: {
  scopeId: string;
  storyId: string;
  revisionId: string;
  draftRevisionId: string;
  comparisonScopeKey: string;
}) {
  return {
    scopeId: input.scopeId,
    scopeKind: "full_approved_draft" as const,
    comparisonScopeKey: input.comparisonScopeKey,
    segmentIds: ["segment:scope:1", "segment:scope:2"],
    eventIds: ["event:airport", "event:meeting"],
    sourceTextRefs: [
      {
        sourceKind: "ingestion_session_raw_text" as const,
        sessionId: "session:scope",
        startOffset: 0,
        endOffset: 48,
        textNormalization: "lf" as const
      }
    ],
    payload: {
      scopeKind: "full_approved_draft" as const,
      scopeId: input.scopeId,
      documentId: "draft-document:scope",
      draftRevisionId: input.draftRevisionId,
      storyId: input.storyId,
      revisionId: input.revisionId
    }
  };
}

async function saveRunWithVerdict(input: {
  verdictRunRepository: VerdictRunRepository;
  verdictRepository: VerdictRepository;
  runId: string;
  storyId: string;
  revisionId: string;
  previousRunId?: string;
  createdAt: string;
  scope?: ReturnType<typeof fullScope>;
  verdictId: string;
  verdictKind: "Hard Contradiction" | "Repairable Gap" | "Soft Drift" | "Consistent";
  category:
    | "physical_impossibility"
    | "temporal_contradiction"
    | "causal_gap"
    | "character_state_contradiction"
    | "rule_conflict"
    | "provenance_gap";
  findingId: string;
  representativeChecker?: "time" | "space" | "physics" | "causality" | "character";
  reasonCode?: string;
  supportingFindings?: Array<{
    checker: "time" | "space" | "physics" | "causality" | "character";
    reasonCode: string;
    category:
      | "physical_impossibility"
      | "temporal_contradiction"
      | "causal_gap"
      | "character_state_contradiction"
      | "rule_conflict"
      | "provenance_gap";
    verdictKind: "Hard Contradiction" | "Repairable Gap" | "Soft Drift" | "Consistent";
    explanation: string;
    evidence: {
      eventIds: string[];
      stateBoundaryIds: string[];
      ruleVersionIds: string[];
      provenanceIds: string[];
    };
  }>;
}) {
  await input.verdictRunRepository.saveRun({
    runId: input.runId,
    storyId: input.storyId,
    revisionId: input.revisionId,
    previousRunId: input.previousRunId,
    triggerKind: "test",
    createdAt: input.createdAt,
    scope: input.scope
  });

  await input.verdictRepository.saveVerdict({
    verdictId: input.verdictId,
    runId: input.runId,
    storyId: input.storyId,
    revisionId: input.revisionId,
    verdictKind: input.verdictKind,
    category: input.category,
    explanation: input.verdictId,
    evidence: {
      findingId: input.findingId,
      eventIds: ["event:airport", "event:meeting"],
      stateBoundaryIds: ["boundary:a"],
      ruleVersionIds: ["ruleversion:reality"],
      provenanceIds: ["provenance:test"],
      representativeChecker: input.representativeChecker,
      reasonCode: input.reasonCode,
      eventSummaries: [],
      stateSummaries: [],
      ruleSummaries: [],
      conflictPath: ["event:airport", "event:meeting"],
      missingPremises: [],
      supportingFindings: input.supportingFindings ?? [],
      notEvaluated: []
    },
    createdAt: input.createdAt
  });
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

  it("uses explicit baseRunId before previousRunId", async () => {
    const fixture = await seedStory(pool);
    const verdictRepository = new VerdictRepository(pool);
    const verdictRunRepository = new VerdictRunRepository(pool);
    const comparisonScopeKey = "full:draft-document:scope";
    const storyId = fixture.graph.story.storyId;
    const revisionId = fixture.graph.revision.revisionId;

    await saveRunWithVerdict({
      verdictRunRepository,
      verdictRepository,
      runId: "run:explicit-base",
      storyId,
      revisionId,
      createdAt: "2026-04-11T01:00:00Z",
      scope: fullScope({
        scopeId: "scope:explicit-base",
        storyId,
        revisionId,
        draftRevisionId: "draft-revision:explicit-base",
        comparisonScopeKey
      }),
      verdictId: "verdict:explicit-base",
      verdictKind: "Repairable Gap",
      category: "causal_gap",
      findingId: "finding:explicit-base",
      representativeChecker: "causality",
      reasonCode: "missing_causal_link"
    });

    await saveRunWithVerdict({
      verdictRunRepository,
      verdictRepository,
      runId: "run:previous-default",
      storyId,
      revisionId,
      createdAt: "2026-04-11T01:05:00Z",
      scope: fullScope({
        scopeId: "scope:previous-default",
        storyId,
        revisionId,
        draftRevisionId: "draft-revision:previous-default",
        comparisonScopeKey
      }),
      verdictId: "verdict:previous-default",
      verdictKind: "Soft Drift",
      category: "provenance_gap",
      findingId: "finding:previous-default",
      representativeChecker: "character",
      reasonCode: "motivation_drift"
    });

    await saveRunWithVerdict({
      verdictRunRepository,
      verdictRepository,
      runId: "run:current-explicit",
      storyId,
      revisionId,
      previousRunId: "run:previous-default",
      createdAt: "2026-04-11T01:10:00Z",
      scope: fullScope({
        scopeId: "scope:current",
        storyId,
        revisionId,
        draftRevisionId: "draft-revision:current",
        comparisonScopeKey
      }),
      verdictId: "verdict:current-explicit",
      verdictKind: "Hard Contradiction",
      category: "temporal_contradiction",
      findingId: "finding:current-explicit",
      representativeChecker: "time",
      reasonCode: "impossible_travel"
    });

    const diff = await diffVerdictRuns({
      currentRunId: "run:current-explicit",
      baseRunId: "run:explicit-base",
      verdictRepository,
      verdictRunRepository
    });

    expect(diff.previousRunId).toBe("run:explicit-base");
    expect(diff.currentScopeId).toBe("scope:current");
    expect(diff.baseScopeId).toBe("scope:explicit-base");
    expect(diff.addedFindingIds).toEqual(["finding:current-explicit"]);
    expect(diff.resolvedFindingIds).toEqual(["finding:explicit-base"]);
    expect(diff.findingChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          changeKind: "added",
          findingId: "finding:current-explicit",
          scopeId: "scope:current",
          comparisonScopeKey
        }),
        expect.objectContaining({
          changeKind: "resolved",
          findingId: "finding:explicit-base",
          scopeId: "scope:explicit-base",
          comparisonScopeKey
        })
      ])
    );
  });

  it("selects the latest comparable run for an explicit baseRevisionId", async () => {
    const fixture = await seedStory(pool);
    const verdictRepository = new VerdictRepository(pool);
    const verdictRunRepository = new VerdictRunRepository(pool);
    const storyId = fixture.graph.story.storyId;
    const currentRevisionId = fixture.graph.revision.revisionId;
    const baseRevisionId = "revision:base";
    const comparisonScopeKey = "full:draft-document:scope";

    await saveRevision(pool, {
      storyId,
      revisionId: baseRevisionId,
      createdAt: "2026-04-11T00:30:00Z"
    });

    await saveRunWithVerdict({
      verdictRunRepository,
      verdictRepository,
      runId: "run:base-earlier",
      storyId,
      revisionId: baseRevisionId,
      createdAt: "2026-04-11T00:35:00Z",
      scope: fullScope({
        scopeId: "scope:base-earlier",
        storyId,
        revisionId: baseRevisionId,
        draftRevisionId: "draft-revision:base-earlier",
        comparisonScopeKey
      }),
      verdictId: "verdict:base-earlier",
      verdictKind: "Repairable Gap",
      category: "causal_gap",
      findingId: "finding:base-earlier",
      representativeChecker: "causality",
      reasonCode: "missing_causal_link"
    });

    await saveRunWithVerdict({
      verdictRunRepository,
      verdictRepository,
      runId: "run:base-latest",
      storyId,
      revisionId: baseRevisionId,
      createdAt: "2026-04-11T00:45:00Z",
      scope: fullScope({
        scopeId: "scope:base-latest",
        storyId,
        revisionId: baseRevisionId,
        draftRevisionId: "draft-revision:base-latest",
        comparisonScopeKey
      }),
      verdictId: "verdict:base-latest",
      verdictKind: "Soft Drift",
      category: "provenance_gap",
      findingId: "finding:base-latest",
      representativeChecker: "character",
      reasonCode: "motivation_drift"
    });

    await saveRunWithVerdict({
      verdictRunRepository,
      verdictRepository,
      runId: "run:current-revision",
      storyId,
      revisionId: currentRevisionId,
      createdAt: "2026-04-11T01:00:00Z",
      scope: fullScope({
        scopeId: "scope:current-revision",
        storyId,
        revisionId: currentRevisionId,
        draftRevisionId: "draft-revision:current-revision",
        comparisonScopeKey
      }),
      verdictId: "verdict:current-revision",
      verdictKind: "Hard Contradiction",
      category: "temporal_contradiction",
      findingId: "finding:current-revision",
      representativeChecker: "time",
      reasonCode: "impossible_travel"
    });

    const diff = await diffVerdictRuns({
      currentRunId: "run:current-revision",
      baseRevisionId,
      verdictRepository,
      verdictRunRepository
    });

    expect(diff.previousRunId).toBe("run:base-latest");
    expect(diff.baseScopeId).toBe("scope:base-latest");
    expect(diff.resolvedFindingIds).toEqual(["finding:base-latest"]);
    expect(diff.resolvedFindingIds).not.toContain("finding:base-earlier");
  });

  it("rejects explicit baseRevisionId when no comparable scoped run exists", async () => {
    const fixture = await seedStory(pool);
    const verdictRepository = new VerdictRepository(pool);
    const verdictRunRepository = new VerdictRunRepository(pool);
    const storyId = fixture.graph.story.storyId;
    const currentRevisionId = fixture.graph.revision.revisionId;
    const baseRevisionId = "revision:incompatible";

    await saveRevision(pool, {
      storyId,
      revisionId: baseRevisionId,
      createdAt: "2026-04-11T00:15:00Z"
    });

    await saveRunWithVerdict({
      verdictRunRepository,
      verdictRepository,
      runId: "run:base-incompatible",
      storyId,
      revisionId: baseRevisionId,
      createdAt: "2026-04-11T00:20:00Z",
      scope: fullScope({
        scopeId: "scope:base-incompatible",
        storyId,
        revisionId: baseRevisionId,
        draftRevisionId: "draft-revision:base-incompatible",
        comparisonScopeKey: "full:draft-document:other"
      }),
      verdictId: "verdict:base-incompatible",
      verdictKind: "Repairable Gap",
      category: "causal_gap",
      findingId: "finding:base-incompatible",
      representativeChecker: "causality",
      reasonCode: "missing_causal_link"
    });

    await saveRunWithVerdict({
      verdictRunRepository,
      verdictRepository,
      runId: "run:current-incompatible",
      storyId,
      revisionId: currentRevisionId,
      createdAt: "2026-04-11T00:25:00Z",
      scope: fullScope({
        scopeId: "scope:current-incompatible",
        storyId,
        revisionId: currentRevisionId,
        draftRevisionId: "draft-revision:current-incompatible",
        comparisonScopeKey: "full:draft-document:scope"
      }),
      verdictId: "verdict:current-incompatible",
      verdictKind: "Hard Contradiction",
      category: "temporal_contradiction",
      findingId: "finding:current-incompatible",
      representativeChecker: "time",
      reasonCode: "impossible_travel"
    });

    await expect(
      diffVerdictRuns({
        currentRunId: "run:current-incompatible",
        baseRevisionId,
        verdictRepository,
        verdictRunRepository
      })
    ).rejects.toThrow(
      "No comparable verdict run found for revision revision:incompatible with comparisonScopeKey full:draft-document:scope."
    );
  });
});
