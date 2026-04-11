import { beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import {
  applyCanonicalSchema,
  IngestionSessionRepository
} from "../../src/storage/index.js";
import type { StructuredExtractionBatch } from "../../src/domain/index.js";
import { planDraftSubmission } from "../../src/services/ingestion-session.js";

function createTestClient() {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  return { pool };
}

function validCharacterPayload(name: string, storyId = "story:test", revisionId = "revision:test") {
  return {
    entityId: `character:${name.toLowerCase()}`,
    storyId,
    revisionId,
    entityKind: "character" as const,
    name,
    aliases: [],
    description: "",
    archetypes: [],
    defaultLoyalties: []
  };
}

function buildStorageDraftPlan() {
  return planDraftSubmission({
    sessionId: "session:storage-draft",
    inputKind: "full_draft",
    rawText: "Chapter 1\nAlice waits.\n\nSection 2\nBob arrives.",
    storyId: "story:storage-draft",
    revisionId: "revision:storage-draft",
    draftTitle: "Storage Draft",
    createdAt: "2026-04-11T03:50:00Z"
  });
}

describe("ingestion session repository", () => {
  let pool: Pool;

  beforeEach(async () => {
    const created = createTestClient();
    pool = created.pool;
    await applyCanonicalSchema(pool);
  });

  it("persists session, segments, and extraction candidates with correctedPayload and source spans", async () => {
    const repository = new IngestionSessionRepository(pool);

    await repository.createSession({
      sessionId: "session:test",
      storyId: "story:test",
      revisionId: "revision:test",
      draftTitle: "Draft",
      defaultRulePackName: "reality-default",
      inputKind: "chunk",
      rawText: "Alice crosses the bridge.",
      workflowState: "submitted",
      promptFamily: "phase5-default",
      modelName: "test-model",
      lastVerdictRunId: null,
      createdAt: "2026-04-10T02:00:00Z",
      updatedAt: "2026-04-10T02:00:00Z",
      lastCheckedAt: null
    });

    await repository.saveSegments("session:test", [
      {
        segmentId: "segment:test:1",
        sessionId: "session:test",
        sequence: 0,
        label: "Chunk 1",
        startOffset: 0,
        endOffset: 25,
        segmentText: "Alice crosses the bridge.",
        workflowState: "submitted",
        approvedAt: null
      }
    ]);

    const batch: StructuredExtractionBatch = {
      sessionId: "session:test",
      segments: [
        {
          segmentId: "segment:test:1",
          workflowState: "needs_review",
          candidates: [
            {
              candidateId: "candidate:test:1",
              sessionId: "session:test",
              segmentId: "segment:test:1",
              candidateKind: "entity",
              canonicalKey: "entity:alice",
              confidence: 0.64,
              reviewNeeded: true,
              reviewNeededReason: "low_confidence",
              sourceSpanStart: 0,
              sourceSpanEnd: 5,
              provenanceDetail: { source: "fixture" },
              extractedPayload: validCharacterPayload("Alice"),
              correctedPayload: {
                ...validCharacterPayload("Alice"),
                aliases: ["Al"]
              },
              normalizedPayload: validCharacterPayload("Alice")
            }
          ]
        }
      ]
    };

    await repository.saveExtractionBatch(batch);
    await repository.setSessionState("session:test", "needs_review", {
      updatedAt: "2026-04-10T02:05:00Z"
    });

    const snapshot = await repository.loadSessionSnapshot("session:test");

    expect(snapshot.session.workflowState).toBe("needs_review");
    expect(snapshot.segments).toHaveLength(1);
    expect(snapshot.segments[0]?.segment.startOffset).toBe(0);
    expect(snapshot.segments[0]?.segment.endOffset).toBe(25);
    expect(snapshot.segments[0]?.candidates[0]?.correctedPayload).toEqual({
      ...validCharacterPayload("Alice"),
      aliases: ["Al"]
    });
    expect(snapshot.segments[0]?.candidates[0]?.sourceSpanStart).toBe(0);
    expect(snapshot.segments[0]?.candidates[0]?.sourceSpanEnd).toBe(5);
  });

  it("keeps extractedPayload intact, persists boundary edits, and reaches partially_approved only after approval", async () => {
    const repository = new IngestionSessionRepository(pool);

    await repository.createSession({
      sessionId: "session:review",
      storyId: "story:test",
      revisionId: "revision:test",
      draftTitle: "Draft",
      defaultRulePackName: "reality-default",
      inputKind: "full_draft",
      rawText: "Alice waits.\n\nBob arrives.",
      workflowState: "needs_review",
      promptFamily: "phase5-default",
      modelName: "test-model",
      lastVerdictRunId: null,
      createdAt: "2026-04-10T02:10:00Z",
      updatedAt: "2026-04-10T02:10:00Z",
      lastCheckedAt: null
    });

    await repository.saveSegments("session:review", [
      {
        segmentId: "segment:review:1",
        sessionId: "session:review",
        sequence: 0,
        label: "Segment 1",
        startOffset: 0,
        endOffset: 11,
        segmentText: "Alice waits.",
        workflowState: "needs_review",
        approvedAt: null
      },
      {
        segmentId: "segment:review:2",
        sessionId: "session:review",
        sequence: 1,
        label: "Segment 2",
        startOffset: 13,
        endOffset: 24,
        segmentText: "Bob arrives.",
        workflowState: "extracted",
        approvedAt: null
      }
    ]);

    await repository.saveExtractionBatch({
      sessionId: "session:review",
      segments: [
        {
          segmentId: "segment:review:1",
          workflowState: "needs_review",
          candidates: [
            {
              candidateId: "candidate:review:1",
              sessionId: "session:review",
              segmentId: "segment:review:1",
              candidateKind: "entity",
              canonicalKey: "entity:alice",
              confidence: 0.92,
              reviewNeeded: true,
              reviewNeededReason: "normalization_failed",
              sourceSpanStart: 0,
              sourceSpanEnd: 5,
              provenanceDetail: { source: "fixture" },
              extractedPayload: { name: "Alice" },
              correctedPayload: null,
              normalizedPayload: null
            }
          ]
        },
        {
          segmentId: "segment:review:2",
          workflowState: "extracted",
          candidates: [
            {
              candidateId: "candidate:review:2",
              sessionId: "session:review",
              segmentId: "segment:review:2",
              candidateKind: "entity",
              canonicalKey: "entity:bob",
              confidence: 0.92,
              reviewNeeded: false,
              reviewNeededReason: null,
              sourceSpanStart: 0,
              sourceSpanEnd: 3,
              provenanceDetail: { source: "fixture" },
              extractedPayload: validCharacterPayload("Bob"),
              correctedPayload: null,
              normalizedPayload: validCharacterPayload("Bob")
            }
          ]
        }
      ]
    });

    const patched = await repository.applySegmentPatch(
      "session:review",
      "segment:review:1",
      {
        boundary: {
          label: "Scene One",
          startOffset: 1,
          endOffset: 12
        },
        candidateCorrections: [
          {
            candidateId: "candidate:review:1",
            correctedPayload: {
              ...validCharacterPayload("Alice"),
              aliases: ["Al"]
            }
          }
        ]
      },
      {
        updatedAt: "2026-04-10T02:11:00Z"
      }
    );

    expect(patched.session.workflowState).toBe("needs_review");
    expect(patched.segments[0]?.segment.label).toBe("Scene One");
    expect(patched.segments[0]?.segment.startOffset).toBe(1);
    expect(patched.segments[0]?.segment.endOffset).toBe(12);
    expect(patched.segments[0]?.candidates[0]?.extractedPayload).toEqual({ name: "Alice" });
    expect(patched.segments[0]?.candidates[0]?.correctedPayload).toEqual({
      ...validCharacterPayload("Alice"),
      aliases: ["Al"]
    });
    expect(patched.segments[0]?.candidates[0]?.normalizedPayload).toEqual({
      ...validCharacterPayload("Alice"),
      aliases: ["Al"]
    });

    const firstApproval = await repository.approveSegment("session:review", "segment:review:1", {
      approvedAt: "2026-04-10T02:12:00Z",
      updatedAt: "2026-04-10T02:12:00Z"
    });
    expect(firstApproval.sessionWorkflowState).toBe("partially_approved");

    const afterFirstApproval = await repository.loadSessionSnapshot("session:review");
    expect(afterFirstApproval.session.workflowState).toBe("partially_approved");

    const secondApproval = await repository.approveSegment("session:review", "segment:review:2", {
      approvedAt: "2026-04-10T02:13:00Z",
      updatedAt: "2026-04-10T02:13:00Z"
    });
    expect(secondApproval.sessionWorkflowState).toBe("approved");

    const approvedSegments = await repository.listApprovedSegments("session:review");
    expect(approvedSegments).toHaveLength(2);
  });

  it("persists draft containers sections source refs and scopes", async () => {
    const repository = new IngestionSessionRepository(pool);
    const plan = buildStorageDraftPlan();

    await repository.createSession({
      sessionId: "session:storage-draft",
      storyId: "story:storage-draft",
      revisionId: "revision:storage-draft",
      draftTitle: "Storage Draft",
      defaultRulePackName: "reality-default",
      inputKind: "full_draft",
      rawText: plan.normalizedRawText,
      workflowState: "submitted",
      promptFamily: "phase5-default",
      modelName: "test-model",
      lastVerdictRunId: null,
      createdAt: "2026-04-11T03:50:00Z",
      updatedAt: "2026-04-11T03:50:00Z",
      lastCheckedAt: null
    });

    await repository.saveDraftPlan("session:storage-draft", plan);
    await repository.saveSegments(
      "session:storage-draft",
      plan.segments.map(({ segment }) => segment)
    );

    const snapshot = await repository.loadSessionSnapshot("session:storage-draft");

    expect(snapshot.session.draftDocumentId).toBe("draft-document:session:storage-draft");
    expect(snapshot.session.draftRevisionId).toBe("draft-revision:session:storage-draft");
    expect(snapshot.draftSections).toHaveLength(2);
    expect(snapshot.checkScopes[0]?.scopeKind).toBe("full_approved_draft");
    expect(snapshot.segments[0]?.segment.sourceTextRef?.textNormalization).toBe("lf");
  });

  it("loads legacy ingestion rows with synthesized draft metadata", async () => {
    const repository = new IngestionSessionRepository(pool);

    await pool.query(
      `
        INSERT INTO ingestion_sessions (
          session_id,
          story_id,
          revision_id,
          draft_title,
          draft_document_id,
          draft_revision_id,
          default_rule_pack_name,
          input_kind,
          raw_text,
          workflow_state,
          prompt_family,
          model_name,
          last_verdict_run_id,
          created_at,
          updated_at,
          last_checked_at
        )
        VALUES ($1, $2, $3, $4, NULL, NULL, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `,
      [
        "session:legacy",
        "story:legacy",
        "revision:legacy",
        "Legacy Draft",
        "reality-default",
        "full_draft",
        "Alice waits.\n\nBob arrives.",
        "submitted",
        "phase5-default",
        "test-model",
        null,
        "2026-04-11T03:51:00Z",
        "2026-04-11T03:51:00Z",
        null
      ]
    );

    await pool.query(
      `
        INSERT INTO ingestion_segments (
          segment_id,
          session_id,
          sequence,
          label,
          start_offset,
          end_offset,
          segment_text,
          draft_revision_id,
          section_id,
          draft_path,
          source_text_ref,
          workflow_state,
          approved_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, NULL, NULL,
          NULL, NULL, $8, $9
        )
      `,
      [
        "segment:legacy:1",
        "session:legacy",
        0,
        "Segment 1",
        0,
        12,
        "Alice waits.",
        "submitted",
        null
      ]
    );

    const snapshot = await repository.loadSessionSnapshot("session:legacy");

    expect(snapshot.session.draftDocumentId).toBe("draft-document:session:legacy");
    expect(snapshot.session.draftRevisionId).toBe("draft-revision:session:legacy");
    expect(snapshot.session.draft?.document.documentId).toBe("draft-document:session:legacy");
    expect(snapshot.session.draft?.revision.draftRevisionId).toBe("draft-revision:session:legacy");
  });

  it("keeps source refs in sync with boundary edits", async () => {
    const repository = new IngestionSessionRepository(pool);
    const plan = buildStorageDraftPlan();

    await repository.createSession({
      sessionId: "session:storage-draft",
      storyId: "story:storage-draft",
      revisionId: "revision:storage-draft",
      draftTitle: "Storage Draft",
      defaultRulePackName: "reality-default",
      inputKind: "full_draft",
      rawText: plan.normalizedRawText,
      workflowState: "submitted",
      promptFamily: "phase5-default",
      modelName: "test-model",
      lastVerdictRunId: null,
      createdAt: "2026-04-11T03:50:00Z",
      updatedAt: "2026-04-11T03:50:00Z",
      lastCheckedAt: null
    });

    await repository.saveDraftPlan("session:storage-draft", plan);
    await repository.saveSegments(
      "session:storage-draft",
      plan.segments.map(({ segment }) => segment)
    );

    const patched = await repository.applySegmentPatch(
      "session:storage-draft",
      "segment:session:storage-draft:1",
      {
        boundary: {
          startOffset: 1,
          endOffset: 23
        },
        candidateCorrections: []
      },
      {
        updatedAt: "2026-04-11T03:52:00Z"
      }
    );

    expect(patched.segments[0]?.segment.sourceTextRef?.startOffset).toBe(1);
    expect(patched.segments[0]?.segment.sourceTextRef?.endOffset).toBe(23);
    expect(patched.segments[0]?.segment.draftPath?.documentId).toBe(
      "draft-document:session:storage-draft"
    );
  });

  it("appends extraction attempts and progressSummary for mixed outcomes", async () => {
    const repository = new IngestionSessionRepository(pool);

    await repository.createSession({
      sessionId: "session:incremental",
      storyId: "story:incremental",
      revisionId: "revision:incremental:1",
      draftTitle: "Incremental Draft",
      defaultRulePackName: "reality-default",
      inputKind: "full_draft",
      rawText: "Alice waits.\n\nBob leaves.",
      workflowState: "submitted",
      promptFamily: "phase5-default",
      modelName: "test-model",
      lastVerdictRunId: null,
      createdAt: "2026-04-11T06:30:00Z",
      updatedAt: "2026-04-11T06:30:00Z",
      lastCheckedAt: null
    });

    await repository.saveSegments("session:incremental", [
      {
        segmentId: "segment:session:incremental:1",
        sessionId: "session:incremental",
        sequence: 0,
        label: "Segment 1",
        startOffset: 0,
        endOffset: 12,
        segmentText: "Alice waits.",
        workflowState: "submitted",
        approvedAt: null
      },
      {
        segmentId: "segment:session:incremental:2",
        sessionId: "session:incremental",
        sequence: 1,
        label: "Segment 2",
        startOffset: 14,
        endOffset: 25,
        segmentText: "Bob leaves.",
        workflowState: "approved",
        approvedAt: "2026-04-11T06:31:00Z"
      }
    ]);

    await repository.saveExtractionBatch({
      sessionId: "session:incremental",
      segments: [
        {
          segmentId: "segment:session:incremental:1",
          workflowState: "extracted",
          candidates: [
            {
              candidateId: "candidate:incremental:1:success",
              sessionId: "session:incremental",
              segmentId: "segment:session:incremental:1",
              candidateKind: "entity",
              canonicalKey: "entity:alice",
              confidence: 0.95,
              reviewNeeded: false,
              reviewNeededReason: null,
              sourceSpanStart: 0,
              sourceSpanEnd: 5,
              provenanceDetail: { source: "fixture" },
              extractedPayload: validCharacterPayload(
                "Alice",
                "story:incremental",
                "revision:incremental:1"
              ),
              correctedPayload: null,
              normalizedPayload: validCharacterPayload(
                "Alice",
                "story:incremental",
                "revision:incremental:1"
              )
            }
          ],
          attempt: {
            attemptId: "attempt:segment:session:incremental:1:1",
            attemptNumber: 1,
            requestKind: "full_session",
            status: "success",
            invalidatedApproval: false,
            startedAt: "2026-04-11T06:31:00Z",
            finishedAt: "2026-04-11T06:31:05Z",
            errorSummary: null
          }
        },
        {
          segmentId: "segment:session:incremental:2",
          workflowState: "approved",
          candidates: [],
          attempt: {
            attemptId: "attempt:segment:session:incremental:2:1",
            attemptNumber: 1,
            requestKind: "full_session",
            status: "success",
            invalidatedApproval: false,
            startedAt: "2026-04-11T06:31:00Z",
            finishedAt: "2026-04-11T06:31:05Z",
            errorSummary: null
          }
        }
      ]
    } as unknown as StructuredExtractionBatch);

    await repository.saveExtractionBatch({
      sessionId: "session:incremental",
      segments: [
        {
          segmentId: "segment:session:incremental:1",
          workflowState: "failed",
          candidates: [],
          attempt: {
            attemptId: "attempt:segment:session:incremental:1:2",
            attemptNumber: 2,
            requestKind: "targeted_retry",
            status: "failed",
            invalidatedApproval: false,
            startedAt: "2026-04-11T06:32:00Z",
            finishedAt: "2026-04-11T06:32:02Z",
            errorSummary: "Extractor failure for segment 1"
          }
        }
      ]
    } as unknown as StructuredExtractionBatch);

    const snapshot = await repository.loadSessionSnapshot("session:incremental");

    expect((snapshot as any).progressSummary.totalSegments).toBe(2);
    expect((snapshot as any).progressSummary.failedSegments).toBe(1);
    expect((snapshot.segments[0] as any).segment.attemptCount).toBe(2);
    expect((snapshot.segments[0] as any).segment.lastAttemptStatus).toBe("failed");
    expect((snapshot.segments[0] as any).attempts.map((attempt: { status: string }) => attempt.status)).toEqual([
      "success",
      "failed"
    ]);
  });

  it("keeps previous candidates when a retry attempt fails", async () => {
    const repository = new IngestionSessionRepository(pool);

    await repository.createSession({
      sessionId: "session:incremental",
      storyId: "story:incremental",
      revisionId: "revision:incremental:1",
      draftTitle: "Incremental Draft",
      defaultRulePackName: "reality-default",
      inputKind: "full_draft",
      rawText: "Alice waits.\n\nBob leaves.",
      workflowState: "submitted",
      promptFamily: "phase5-default",
      modelName: "test-model",
      lastVerdictRunId: null,
      createdAt: "2026-04-11T06:35:00Z",
      updatedAt: "2026-04-11T06:35:00Z",
      lastCheckedAt: null
    });

    await repository.saveSegments("session:incremental", [
      {
        segmentId: "segment:session:incremental:1",
        sessionId: "session:incremental",
        sequence: 0,
        label: "Segment 1",
        startOffset: 0,
        endOffset: 12,
        segmentText: "Alice waits.",
        workflowState: "submitted",
        approvedAt: null
      }
    ]);

    await repository.saveExtractionBatch({
      sessionId: "session:incremental",
      segments: [
        {
          segmentId: "segment:session:incremental:1",
          workflowState: "extracted",
          candidates: [
            {
              candidateId: "candidate:incremental:1:success",
              sessionId: "session:incremental",
              segmentId: "segment:session:incremental:1",
              candidateKind: "entity",
              canonicalKey: "entity:alice",
              confidence: 0.95,
              reviewNeeded: false,
              reviewNeededReason: null,
              sourceSpanStart: 0,
              sourceSpanEnd: 5,
              provenanceDetail: { source: "fixture" },
              extractedPayload: validCharacterPayload(
                "Alice",
                "story:incremental",
                "revision:incremental:1"
              ),
              correctedPayload: null,
              normalizedPayload: validCharacterPayload(
                "Alice",
                "story:incremental",
                "revision:incremental:1"
              )
            }
          ],
          attempt: {
            attemptId: "attempt:segment:session:incremental:1:1",
            attemptNumber: 1,
            requestKind: "full_session",
            status: "success",
            invalidatedApproval: false,
            startedAt: "2026-04-11T06:35:10Z",
            finishedAt: "2026-04-11T06:35:12Z",
            errorSummary: null
          }
        }
      ]
    } as unknown as StructuredExtractionBatch);

    await repository.saveExtractionBatch({
      sessionId: "session:incremental",
      segments: [
        {
          segmentId: "segment:session:incremental:1",
          workflowState: "failed",
          candidates: [],
          attempt: {
            attemptId: "attempt:segment:session:incremental:1:2",
            attemptNumber: 2,
            requestKind: "targeted_retry",
            status: "failed",
            invalidatedApproval: false,
            startedAt: "2026-04-11T06:35:20Z",
            finishedAt: "2026-04-11T06:35:22Z",
            errorSummary: "Extractor failure for segment 1"
          }
        }
      ]
    } as unknown as StructuredExtractionBatch);

    const snapshot = await repository.loadSessionSnapshot("session:incremental");

    expect(snapshot.segments[0]?.candidates[0]?.candidateId).toBe("candidate:incremental:1:success");
    expect((snapshot.segments[0] as any).segment.lastFailureSummary).toBe("Extractor failure for segment 1");
    expect((snapshot.segments[0] as any).attempts.map((attempt: { status: string }) => attempt.status)).toEqual([
      "success",
      "failed"
    ]);
  });
});
