import { beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import { executeIngestionCheck } from "../../src/services/ingestion-check.js";
import { IngestionConflictError } from "../../src/services/ingestion-review.js";
import {
  applyCanonicalSchema,
  IngestionSessionRepository,
  RuleRepository,
  StoryRepository,
  VerdictRepository,
  VerdictRunRepository
} from "../../src/storage/index.js";
import { buildImpossibleTravelFixture } from "../fixtures/hard-constraint-fixtures.js";

function createTestClient() {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  return { pool };
}

function createSourceTextRef(sessionId: string, startOffset: number, endOffset: number) {
  return {
    sourceKind: "ingestion_session_raw_text" as const,
    sessionId,
    startOffset,
    endOffset,
    textNormalization: "lf" as const
  };
}

async function seedScopedSession(input: {
  ingestionSessionRepository: IngestionSessionRepository;
  storyRepository: StoryRepository;
  ruleRepository: RuleRepository;
  sessionId: string;
  secondSegmentState: "approved" | "needs_review";
  secondSegmentApprovedAt?: string | null;
  secondSegmentStale?: boolean;
}) {
  const fixture = buildImpossibleTravelFixture();
  const sessionId = input.sessionId;
  const firstSegmentId = `${sessionId}:segment:1`;
  const secondSegmentId = `${sessionId}:segment:2`;
  const firstSectionId = `draft-section:${sessionId}:1`;
  const secondSectionId = `draft-section:${sessionId}:2`;

  await input.storyRepository.saveGraph(fixture.graph);
  for (const rule of fixture.availableRules) {
    if (rule.version) {
      await input.ruleRepository.saveRulePack(rule.metadata, rule.version);
    }
  }

  await input.ingestionSessionRepository.createSession({
    sessionId,
    storyId: fixture.graph.story.storyId,
    revisionId: fixture.graph.revision.revisionId,
    draftTitle: "Scoped Check Draft",
    defaultRulePackName: fixture.graph.story.defaultRulePackName,
    inputKind: "full_draft",
    rawText: "Airport scene.\n\nMeeting scene.",
    workflowState: "approved",
    promptFamily: "phase11-test",
    modelName: "test-model",
    lastVerdictRunId: null,
    createdAt: "2026-04-11T07:10:00Z",
    updatedAt: "2026-04-11T07:10:00Z",
    lastCheckedAt: null
  });

  await input.ingestionSessionRepository.saveDraftPlan(sessionId, {
    document: {
      documentId: `draft-document:${sessionId}`,
      storyId: fixture.graph.story.storyId,
      title: "Scoped Check Draft",
      createdAt: "2026-04-11T07:10:00Z",
      updatedAt: "2026-04-11T07:10:00Z"
    },
    revision: {
      draftRevisionId: `draft-revision:${sessionId}`,
      documentId: `draft-document:${sessionId}`,
      storyId: fixture.graph.story.storyId,
      revisionId: fixture.graph.revision.revisionId,
      basedOnDraftRevisionId: null,
      createdAt: "2026-04-11T07:10:00Z"
    },
    sections: [
      {
        sectionId: firstSectionId,
        draftRevisionId: `draft-revision:${sessionId}`,
        sectionKind: "chapter",
        sequence: 0,
        label: "Chapter One",
        sourceTextRef: createSourceTextRef(sessionId, 0, 13)
      },
      {
        sectionId: secondSectionId,
        draftRevisionId: `draft-revision:${sessionId}`,
        sectionKind: "chapter",
        sequence: 1,
        label: "Chapter Two",
        sourceTextRef: createSourceTextRef(sessionId, 15, 28)
      }
    ],
    segments: [
      {
        segment: {
          segmentId: firstSegmentId,
          sessionId,
          sequence: 0,
          label: "Airport scene",
          startOffset: 0,
          endOffset: 13,
          segmentText: "Airport scene.",
          draftRevisionId: `draft-revision:${sessionId}`,
          sectionId: firstSectionId,
          draftPath: {
            documentId: `draft-document:${sessionId}`,
            draftRevisionId: `draft-revision:${sessionId}`,
            sectionId: firstSectionId,
            segmentId: firstSegmentId,
            sequence: 0
          },
          sourceTextRef: createSourceTextRef(sessionId, 0, 13),
          workflowState: "approved",
          approvedAt: "2026-04-11T07:11:00Z"
        },
        sourceTextRef: createSourceTextRef(sessionId, 0, 13),
        draftPath: {
          documentId: `draft-document:${sessionId}`,
          draftRevisionId: `draft-revision:${sessionId}`,
          sectionId: firstSectionId,
          segmentId: firstSegmentId,
          sequence: 0
        }
      },
      {
        segment: {
          segmentId: secondSegmentId,
          sessionId,
          sequence: 1,
          label: "Meeting scene",
          startOffset: 15,
          endOffset: 28,
          segmentText: "Meeting scene.",
          draftRevisionId: `draft-revision:${sessionId}`,
          sectionId: secondSectionId,
          draftPath: {
            documentId: `draft-document:${sessionId}`,
            draftRevisionId: `draft-revision:${sessionId}`,
            sectionId: secondSectionId,
            segmentId: secondSegmentId,
            sequence: 1
          },
          sourceTextRef: createSourceTextRef(sessionId, 15, 28),
          workflowState: input.secondSegmentState,
          approvedAt: input.secondSegmentApprovedAt ?? null,
          stale: input.secondSegmentStale ?? false
        },
        sourceTextRef: createSourceTextRef(sessionId, 15, 28),
        draftPath: {
          documentId: `draft-document:${sessionId}`,
          draftRevisionId: `draft-revision:${sessionId}`,
          sectionId: secondSectionId,
          segmentId: secondSegmentId,
          sequence: 1
        }
      }
    ],
    checkScopes: [
      {
        scopeKind: "full_approved_draft",
        scopeId: `scope:${sessionId}:full`,
        documentId: `draft-document:${sessionId}`,
        draftRevisionId: `draft-revision:${sessionId}`,
        storyId: fixture.graph.story.storyId,
        revisionId: fixture.graph.revision.revisionId
      },
      {
        scopeKind: "section",
        scopeId: `scope:${sessionId}:section:1`,
        documentId: `draft-document:${sessionId}`,
        draftRevisionId: `draft-revision:${sessionId}`,
        sectionId: firstSectionId,
        sourceTextRef: createSourceTextRef(sessionId, 0, 13)
      },
      {
        scopeKind: "section",
        scopeId: `scope:${sessionId}:section:2`,
        documentId: `draft-document:${sessionId}`,
        draftRevisionId: `draft-revision:${sessionId}`,
        sectionId: secondSectionId,
        sourceTextRef: createSourceTextRef(sessionId, 15, 28)
      }
    ],
    normalizedRawText: "Airport scene.\n\nMeeting scene."
  });

  await input.ingestionSessionRepository.saveSegments(sessionId, [
    {
      segmentId: firstSegmentId,
      sessionId,
      sequence: 0,
      label: "Airport scene",
      startOffset: 0,
      endOffset: 13,
      segmentText: "Airport scene.",
      draftRevisionId: `draft-revision:${sessionId}`,
      sectionId: firstSectionId,
      draftPath: {
        documentId: `draft-document:${sessionId}`,
        draftRevisionId: `draft-revision:${sessionId}`,
        sectionId: firstSectionId,
        segmentId: firstSegmentId,
        sequence: 0
      },
      sourceTextRef: createSourceTextRef(sessionId, 0, 13),
      workflowState: "approved",
      approvedAt: "2026-04-11T07:11:00Z"
    },
    {
      segmentId: secondSegmentId,
      sessionId,
      sequence: 1,
      label: "Meeting scene",
      startOffset: 15,
      endOffset: 28,
      segmentText: "Meeting scene.",
      draftRevisionId: `draft-revision:${sessionId}`,
      sectionId: secondSectionId,
      draftPath: {
        documentId: `draft-document:${sessionId}`,
        draftRevisionId: `draft-revision:${sessionId}`,
        sectionId: secondSectionId,
        segmentId: secondSegmentId,
        sequence: 1
      },
      sourceTextRef: createSourceTextRef(sessionId, 15, 28),
      workflowState: input.secondSegmentState,
      approvedAt: input.secondSegmentApprovedAt ?? null,
      stale: input.secondSegmentStale ?? false
    }
  ]);

  await input.ingestionSessionRepository.saveExtractionBatch({
    sessionId,
    segments: [
      {
        segmentId: firstSegmentId,
        workflowState: "approved",
        candidates: [
          {
            candidateId: `${firstSegmentId}:event:airport`,
            candidateKind: "event",
            canonicalKey: "event:airport",
            confidence: 0.99,
            sourceSpanStart: 0,
            sourceSpanEnd: 13,
            provenanceDetail: { source: "scoped-check-fixture" },
            payload: fixture.graph.events[0]
          }
        ]
      },
      {
        segmentId: secondSegmentId,
        workflowState: input.secondSegmentState,
        candidates: [
          {
            candidateId: `${secondSegmentId}:event:meeting`,
            candidateKind: "event",
            canonicalKey: "event:meeting",
            confidence: 0.99,
            sourceSpanStart: 15,
            sourceSpanEnd: 28,
            provenanceDetail: { source: "scoped-check-fixture" },
            payload: fixture.graph.events[1]
          }
        ]
      }
    ]
  });
}

describe("scoped ingestion checks", () => {
  let pool: Pool;
  let ingestionSessionRepository: IngestionSessionRepository;
  let storyRepository: StoryRepository;
  let ruleRepository: RuleRepository;
  let verdictRepository: VerdictRepository;
  let verdictRunRepository: VerdictRunRepository;

  beforeEach(async () => {
    const created = createTestClient();
    pool = created.pool;
    await applyCanonicalSchema(pool);
    ingestionSessionRepository = new IngestionSessionRepository(pool);
    storyRepository = new StoryRepository(pool);
    ruleRepository = new RuleRepository(pool);
    verdictRepository = new VerdictRepository(pool);
    verdictRunRepository = new VerdictRunRepository(pool);
  });

  it("runs a scoped check when the selected scope is approved and current", async () => {
    const sessionId = "session:scoped-check";
    await seedScopedSession({
      ingestionSessionRepository,
      storyRepository,
      ruleRepository,
      sessionId,
      secondSegmentState: "needs_review"
    });

    const result = await executeIngestionCheck(
      sessionId,
      {
        ingestionSessionRepository,
        storyRepository,
        ruleRepository,
        verdictRepository,
        verdictRunRepository,
        now: () => "2026-04-11T07:12:00Z"
      },
      { scopeId: `scope:${sessionId}:section:1` }
    );

    const run = await verdictRunRepository.getRun(result.runId);
    const verdicts = await verdictRepository.listForRun(result.runId);

    expect(result.workflowState).toBe("checked");
    expect(run?.scope?.scopeId).toBe(`scope:${sessionId}:section:1`);
    expect(verdicts).toHaveLength(1);
    expect(verdicts[0]?.verdictId).toContain("event:airport");
  });

  it("rejects a scoped check when any segment in the scope is stale or unapproved", async () => {
    const sessionId = "session:scoped-conflict";
    await seedScopedSession({
      ingestionSessionRepository,
      storyRepository,
      ruleRepository,
      sessionId,
      secondSegmentState: "approved",
      secondSegmentApprovedAt: "2026-04-11T07:11:30Z",
      secondSegmentStale: true
    });

    await expect(
      executeIngestionCheck(
        sessionId,
        {
          ingestionSessionRepository,
          storyRepository,
          ruleRepository,
          verdictRepository,
          verdictRunRepository,
          now: () => "2026-04-11T07:12:30Z"
        },
        { scopeId: `scope:${sessionId}:full` }
      )
    ).rejects.toMatchObject({
      name: IngestionConflictError.name,
      message: expect.stringContaining("approved and current")
    });
  });
});
