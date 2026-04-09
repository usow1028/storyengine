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
});
