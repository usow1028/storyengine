import { beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import {
  applyCanonicalSchema,
  IngestionSessionRepository,
  ProvenanceRepository,
  RuleRepository,
  StoryRepository
} from "../../src/storage/index.js";
import { applyReviewPatch, approveReviewedSegment } from "../../src/services/ingestion-review.js";

function createTestClient() {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  return { pool };
}

function validCharacterPayload(
  name: string,
  sessionId = "session:workflow"
) {
  return {
    entityId: `character:${name.toLowerCase()}`,
    storyId: `story:draft:${sessionId}`,
    revisionId: `revision:draft:${sessionId}`,
    entityKind: "character" as const,
    name,
    aliases: [],
    description: "",
    archetypes: [],
    defaultLoyalties: []
  };
}

describe("ingestion review workflow", () => {
  let pool: Pool;
  let ingestionSessionRepository: IngestionSessionRepository;
  let storyRepository: StoryRepository;
  let ruleRepository: RuleRepository;
  let provenanceRepository: ProvenanceRepository;

  beforeEach(async () => {
    const created = createTestClient();
    pool = created.pool;
    await applyCanonicalSchema(pool);
    ingestionSessionRepository = new IngestionSessionRepository(pool);
    storyRepository = new StoryRepository(pool);
    ruleRepository = new RuleRepository(pool);
    provenanceRepository = new ProvenanceRepository(pool);
  });

  it("updates normalizedPayload through structured corrections and promotes only approved segments with provenance", async () => {
    await ingestionSessionRepository.createSession({
      sessionId: "session:workflow",
      storyId: "story:draft:session:workflow",
      revisionId: "revision:draft:session:workflow",
      draftTitle: "Workflow Draft",
      defaultRulePackName: "reality-default",
      inputKind: "full_draft",
      rawText: "Alice waits.\n\nBob leaves.",
      workflowState: "needs_review",
      promptFamily: "phase5-default",
      modelName: "test-model",
      lastVerdictRunId: null,
      createdAt: "2026-04-10T02:20:00Z",
      updatedAt: "2026-04-10T02:20:00Z",
      lastCheckedAt: null
    });

    await ingestionSessionRepository.saveSegments("session:workflow", [
      {
        segmentId: "segment:workflow:1",
        sessionId: "session:workflow",
        sequence: 0,
        label: "Scene One",
        startOffset: 0,
        endOffset: 11,
        segmentText: "Alice waits.",
        workflowState: "needs_review",
        approvedAt: null
      },
      {
        segmentId: "segment:workflow:2",
        sessionId: "session:workflow",
        sequence: 1,
        label: "Scene Two",
        startOffset: 13,
        endOffset: 23,
        segmentText: "Bob leaves.",
        workflowState: "extracted",
        approvedAt: null
      }
    ]);

    await ingestionSessionRepository.saveExtractionBatch({
      sessionId: "session:workflow",
      segments: [
        {
          segmentId: "segment:workflow:1",
          workflowState: "needs_review",
          candidates: [
            {
              candidateId: "candidate:workflow:1",
              sessionId: "session:workflow",
              segmentId: "segment:workflow:1",
              candidateKind: "entity",
              canonicalKey: "entity:alice",
              confidence: 0.82,
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
          segmentId: "segment:workflow:2",
          workflowState: "extracted",
          candidates: [
            {
              candidateId: "candidate:workflow:2",
              sessionId: "session:workflow",
              segmentId: "segment:workflow:2",
              candidateKind: "entity",
              canonicalKey: "entity:bob",
              confidence: 0.95,
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

    const patched = await applyReviewPatch(
      "session:workflow",
      "segment:workflow:1",
      {
        candidateCorrections: [
          {
            candidateId: "candidate:workflow:1",
            correctedPayload: {
              ...validCharacterPayload("Alice"),
              aliases: ["Al"]
            }
          }
        ]
      },
      {
        ingestionSessionRepository,
        now: () => "2026-04-10T02:21:00Z"
      }
    );

    expect(patched.segments[0]?.candidates[0]?.correctedPayload).toEqual({
      ...validCharacterPayload("Alice"),
      aliases: ["Al"]
    });
    expect(patched.segments[0]?.candidates[0]?.normalizedPayload).toEqual({
      ...validCharacterPayload("Alice"),
      aliases: ["Al"]
    });

    const approved = await approveReviewedSegment("session:workflow", "segment:workflow:1", {
      ingestionSessionRepository,
      storyRepository,
      ruleRepository,
      provenanceRepository,
      now: () => "2026-04-10T02:22:00Z"
    });

    expect(approved.session.workflowState).toBe("partially_approved");
    const graph = await storyRepository.loadGraph(
      "story:draft:session:workflow",
      "revision:draft:session:workflow"
    );
    expect(graph.entities.map((entity) => entity.entityId)).toContain("character:alice");
    expect(graph.entities.map((entity) => entity.entityId)).not.toContain("character:bob");

    const aliceProvenance = await provenanceRepository.listByOwner("entity", "character:alice");
    expect(aliceProvenance).toHaveLength(1);
    expect(aliceProvenance[0]?.detail.extractedPayload).toEqual({ name: "Alice" });
    expect(aliceProvenance[0]?.detail.correctedPayload).toEqual({
      ...validCharacterPayload("Alice"),
      aliases: ["Al"]
    });

    const bobProvenance = await provenanceRepository.listByOwner("entity", "character:bob");
    expect(bobProvenance).toHaveLength(0);
  });

  it("clears approval and marks only the changed approved segment stale", async () => {
    await ingestionSessionRepository.createSession({
      sessionId: "session:review-reset",
      storyId: "story:draft:session:review-reset",
      revisionId: "revision:draft:session:review-reset",
      draftTitle: "Review Reset Draft",
      defaultRulePackName: "reality-default",
      inputKind: "full_draft",
      rawText: "Alice waits.\n\nBob leaves.",
      workflowState: "approved",
      promptFamily: "phase5-default",
      modelName: "test-model",
      lastVerdictRunId: null,
      createdAt: "2026-04-11T07:00:00Z",
      updatedAt: "2026-04-11T07:00:00Z",
      lastCheckedAt: null
    });

    const firstApprovedAt = "2026-04-11T07:01:00Z";
    const secondApprovedAt = "2026-04-11T07:02:00Z";
    await ingestionSessionRepository.saveSegments("session:review-reset", [
      {
        segmentId: "segment:review-reset:1",
        sessionId: "session:review-reset",
        sequence: 0,
        label: "Scene One",
        startOffset: 0,
        endOffset: 11,
        segmentText: "Alice waits.",
        workflowState: "approved",
        approvedAt: firstApprovedAt
      },
      {
        segmentId: "segment:review-reset:2",
        sessionId: "session:review-reset",
        sequence: 1,
        label: "Scene Two",
        startOffset: 13,
        endOffset: 23,
        segmentText: "Bob leaves.",
        workflowState: "approved",
        approvedAt: secondApprovedAt
      }
    ]);

    await ingestionSessionRepository.saveExtractionBatch({
      sessionId: "session:review-reset",
      segments: [
        {
          segmentId: "segment:review-reset:1",
          workflowState: "approved",
          candidates: [
            {
              candidateId: "candidate:review-reset:1",
              sessionId: "session:review-reset",
              segmentId: "segment:review-reset:1",
              candidateKind: "entity",
              canonicalKey: "entity:alice",
              confidence: 0.95,
              reviewNeeded: false,
              reviewNeededReason: null,
              sourceSpanStart: 0,
              sourceSpanEnd: 5,
              provenanceDetail: { source: "fixture" },
              extractedPayload: validCharacterPayload("Alice", "session:review-reset"),
              correctedPayload: null,
              normalizedPayload: validCharacterPayload("Alice", "session:review-reset")
            }
          ]
        },
        {
          segmentId: "segment:review-reset:2",
          workflowState: "approved",
          candidates: [
            {
              candidateId: "candidate:review-reset:2",
              sessionId: "session:review-reset",
              segmentId: "segment:review-reset:2",
              candidateKind: "entity",
              canonicalKey: "entity:bob",
              confidence: 0.95,
              reviewNeeded: false,
              reviewNeededReason: null,
              sourceSpanStart: 0,
              sourceSpanEnd: 3,
              provenanceDetail: { source: "fixture" },
              extractedPayload: validCharacterPayload("Bob", "session:review-reset"),
              correctedPayload: null,
              normalizedPayload: validCharacterPayload("Bob", "session:review-reset")
            }
          ]
        }
      ]
    });

    const patched = await applyReviewPatch(
      "session:review-reset",
      "segment:review-reset:1",
      {
        candidateCorrections: [],
        boundary: {
          label: "Scene One Revised",
          startOffset: 1,
          endOffset: 12
        }
      },
      {
        ingestionSessionRepository,
        now: () => "2026-04-11T07:03:00Z"
      }
    );

    expect(patched.session.workflowState).toBe("partially_approved");
    expect(patched.segments[0]?.segment.workflowState).toBe("needs_review");
    expect(patched.segments[0]?.segment.approvedAt).toBeNull();
    expect(patched.segments[0]?.segment.stale).toBe(true);
    expect(patched.segments[0]?.segment.staleReason).toBe("boundary_changed");
    expect(patched.segments[1]?.segment.workflowState).toBe("approved");
    expect(patched.segments[1]?.segment.approvedAt).toBe(secondApprovedAt);
    expect(patched.segments[1]?.segment.stale).toBe(false);
  });

  it("treats unchanged reapproval as a no-op without duplicate provenance", async () => {
    await ingestionSessionRepository.createSession({
      sessionId: "session:reapprove",
      storyId: "story:draft:session:reapprove",
      revisionId: "revision:draft:session:reapprove",
      draftTitle: "Reapprove Draft",
      defaultRulePackName: "reality-default",
      inputKind: "chunk",
      rawText: "Alice waits.",
      workflowState: "extracted",
      promptFamily: "phase5-default",
      modelName: "test-model",
      lastVerdictRunId: null,
      createdAt: "2026-04-11T07:10:00Z",
      updatedAt: "2026-04-11T07:10:00Z",
      lastCheckedAt: null
    });

    await ingestionSessionRepository.saveSegments("session:reapprove", [
      {
        segmentId: "segment:reapprove:1",
        sessionId: "session:reapprove",
        sequence: 0,
        label: "Chunk 1",
        startOffset: 0,
        endOffset: 11,
        segmentText: "Alice waits.",
        workflowState: "extracted",
        approvedAt: null
      }
    ]);

    await ingestionSessionRepository.saveExtractionBatch({
      sessionId: "session:reapprove",
      segments: [
        {
          segmentId: "segment:reapprove:1",
          workflowState: "extracted",
          candidates: [
            {
              candidateId: "candidate:reapprove:1",
              sessionId: "session:reapprove",
              segmentId: "segment:reapprove:1",
              candidateKind: "entity",
              canonicalKey: "entity:alice",
              confidence: 0.95,
              reviewNeeded: false,
              reviewNeededReason: null,
              sourceSpanStart: 0,
              sourceSpanEnd: 5,
              provenanceDetail: { source: "fixture" },
              extractedPayload: validCharacterPayload("Alice", "session:reapprove"),
              correctedPayload: null,
              normalizedPayload: validCharacterPayload("Alice", "session:reapprove")
            }
          ]
        }
      ]
    });

    const firstApproved = await approveReviewedSegment("session:reapprove", "segment:reapprove:1", {
      ingestionSessionRepository,
      storyRepository,
      ruleRepository,
      provenanceRepository,
      now: () => "2026-04-11T07:11:00Z"
    });
    const firstApprovedAt = firstApproved.segments[0]?.segment.approvedAt;
    const firstProvenance = await provenanceRepository.listByOwner("entity", "character:alice");

    const secondApproved = await approveReviewedSegment("session:reapprove", "segment:reapprove:1", {
      ingestionSessionRepository,
      storyRepository,
      ruleRepository,
      provenanceRepository,
      now: () => "2026-04-11T07:12:00Z"
    });
    const secondProvenance = await provenanceRepository.listByOwner("entity", "character:alice");

    expect(firstApproved.session.workflowState).toBe("approved");
    expect(firstApprovedAt).toBe("2026-04-11T07:11:00Z");
    expect(secondApproved.session.workflowState).toBe("approved");
    expect(secondApproved.segments[0]?.segment.approvedAt).toBe(firstApprovedAt);
    expect(firstProvenance).toHaveLength(1);
    expect(secondProvenance).toHaveLength(1);
  });
});
