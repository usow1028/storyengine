import { beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import { applyCanonicalSchema, IngestionSessionRepository } from "../../src/storage/index.js";
import {
  createConfiguredIngestionLlmClient,
  extractIngestionSession,
  normalizeDraftSourceText,
  planDraftSubmission,
  segmentSubmissionText,
  submitIngestionSession
} from "../../src/services/ingestion-session.js";

function createTestClient() {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  return { pool };
}

describe("natural language extraction", () => {
  let pool: Pool;
  let repository: IngestionSessionRepository;

  beforeEach(async () => {
    const created = createTestClient();
    pool = created.pool;
    await applyCanonicalSchema(pool);
    repository = new IngestionSessionRepository(pool);
  });

  it("segments a full_draft into reviewable units", () => {
    const segments = segmentSubmissionText({
      sessionId: "session:segmentation",
      inputKind: "full_draft",
      rawText: "Scene One\nAlice wakes up.\n\nScene Two\nAlice runs away."
    });

    expect(segments).toHaveLength(2);
    expect(segments[0]?.label).toBe("Scene One");
    expect(segments[1]?.label).toBe("Scene Two");
  });

  it("plans chapter-scale drafts with document revision section and source refs", () => {
    const plan = planDraftSubmission({
      sessionId: "session:chapter-scale",
      inputKind: "full_draft",
      rawText: "Chapter 1\r\nAlice waits.\r\n\r\nSection 2\r\nBob arrives.",
      storyId: "story:chapter-scale",
      revisionId: "revision:chapter-scale"
    });

    expect(plan.document.documentId).toBe("draft-document:session:chapter-scale");
    expect(plan.revision.draftRevisionId).toBe("draft-revision:session:chapter-scale");
    expect(plan.sections).toHaveLength(2);
    expect(plan.sections[0]).toMatchObject({
      sectionId: "draft-section:session:chapter-scale:1",
      sectionKind: "chapter",
      label: "Chapter 1"
    });
    expect(plan.sections[1]).toMatchObject({
      sectionId: "draft-section:session:chapter-scale:2",
      sectionKind: "section",
      label: "Section 2"
    });
    expect(plan.checkScopes).toHaveLength(1);
    expect(plan.checkScopes[0]?.scopeKind).toBe("full_approved_draft");
    expect(plan.segments[0]?.segment.draftPath?.documentId).toBe(plan.document.documentId);
    expect(plan.segments[0]?.segment.sourceTextRef?.textNormalization).toBe("lf");
    expect(plan.normalizedRawText.slice(
      plan.segments[0]?.segment.startOffset ?? 0,
      plan.segments[0]?.segment.endOffset ?? 0
    )).toBe(plan.segments[0]?.segment.segmentText);
    expect(plan.normalizedRawText.slice(
      plan.segments[1]?.segment.startOffset ?? 0,
      plan.segments[1]?.segment.endOffset ?? 0
    )).toBe(plan.segments[1]?.segment.segmentText);
  });

  it("normalizes CRLF before computing source offsets", () => {
    const rawText = "Chapter 1\r\nAlice waits.\rSection 2\r\nBob arrives.";
    const normalized = normalizeDraftSourceText(rawText);

    expect(normalized).toBe("Chapter 1\nAlice waits.\nSection 2\nBob arrives.");

    const plan = planDraftSubmission({
      sessionId: "session:chapter-scale",
      inputKind: "full_draft",
      rawText: "Chapter 1\r\nAlice waits.\r\n\r\nSection 2\r\nBob arrives."
    });

    for (const entry of plan.segments) {
      expect(
        plan.normalizedRawText.slice(
          entry.segment.sourceTextRef?.startOffset ?? 0,
          entry.segment.sourceTextRef?.endOffset ?? 0
        )
      ).toBe(entry.segment.segmentText);
    }
  });

  it("keeps chunk segmentation compatibility", () => {
    const plan = planDraftSubmission({
      sessionId: "session:chapter-scale",
      inputKind: "chunk",
      rawText: "Alice waits."
    });

    const segments = segmentSubmissionText({
      sessionId: "session:chapter-scale",
      inputKind: "chunk",
      rawText: "Alice waits."
    });

    expect(plan.segments).toHaveLength(1);
    expect(plan.segments[0]?.segment.label).toBe("Chunk 1");
    expect(plan.segments[0]?.segment.segmentId).toBe("segment:session:chapter-scale:1");
    expect(segments).toHaveLength(1);
    expect(segments[0]?.label).toBe("Chunk 1");
    expect(segments[0]?.segmentText).toBe("Alice waits.");
  });

  it("routes low-confidence extraction to needs_review", async () => {
    const llmClient = createConfiguredIngestionLlmClient({
      modelName: "test-model",
      extractor: async ({ sessionId, segmentId }) => ({
        candidates: [
          {
            candidateId: `${segmentId}:entity`,
            candidateKind: "entity",
            canonicalKey: "entity:alice",
            confidence: 0.6,
            sourceSpanStart: 0,
            sourceSpanEnd: 5,
            provenanceDetail: { sessionId },
            payload: {
              entityId: "character:alice",
              entityKind: "character",
              name: "Alice",
              aliases: [],
              description: "",
              archetypes: [],
              defaultLoyalties: []
            }
          }
        ]
      })
    });

    const submitted = await submitIngestionSession(
      {
        submissionKind: "chunk",
        text: "Alice wakes up.",
        draftTitle: "Draft"
      },
      {
        ingestionSessionRepository: repository,
        llmClient,
        generateId: () => "low-confidence",
        now: () => "2026-04-10T02:00:00Z"
      }
    );

    expect(submitted.session.workflowState).toBe("submitted");
    expect(submitted.segments).toHaveLength(1);

    const extracted = await extractIngestionSession(submitted.session.sessionId, {
      ingestionSessionRepository: repository,
      llmClient,
      generateId: () => "candidate-low-confidence",
      now: () => "2026-04-10T02:01:00Z"
    });

    expect(extracted.session.workflowState).toBe("needs_review");
    expect(extracted.segments[0]?.segment.workflowState).toBe("needs_review");
    expect(extracted.segments[0]?.candidates[0]?.reviewNeededReason).toBe("low_confidence");
  });
});
