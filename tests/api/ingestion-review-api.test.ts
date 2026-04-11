import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

import { buildStoryGraphApi } from "../../src/api/app.js";
import {
  applyCanonicalSchema,
  IngestionSessionRepository,
  ProvenanceRepository,
  RuleRepository,
  StoryRepository,
  VerdictRepository,
  VerdictRunRepository
} from "../../src/storage/index.js";
import { createConfiguredIngestionLlmClient } from "../../src/services/ingestion-session.js";

function createTestClient() {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  return { pool };
}

function correctedCharacterPayload(name: string, sessionId: string) {
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

describe("ingestion review api", () => {
  let pool: Pool;
  let repository: IngestionSessionRepository;
  let storyRepository: StoryRepository;
  let ruleRepository: RuleRepository;
  let provenanceRepository: ProvenanceRepository;
  let verdictRepository: VerdictRepository;
  let verdictRunRepository: VerdictRunRepository;

  beforeEach(async () => {
    const created = createTestClient();
    pool = created.pool;
    await applyCanonicalSchema(pool);
    repository = new IngestionSessionRepository(pool);
    storyRepository = new StoryRepository(pool);
    ruleRepository = new RuleRepository(pool);
    provenanceRepository = new ProvenanceRepository(pool);
    verdictRepository = new VerdictRepository(pool);
    verdictRunRepository = new VerdictRunRepository(pool);
  });

  afterEach(async () => {
    await pool.end();
  });

  it("supports structured patch and segment approval with explicit workflow states", async () => {
    const llmClient = createConfiguredIngestionLlmClient({
      modelName: "test-model",
      extractor: async ({ segmentId }) => ({
        candidates: [
          {
            candidateId: `${segmentId}:entity`,
            candidateKind: "entity",
            canonicalKey: `entity:${segmentId.endsWith(":1") ? "alice" : "bob"}`,
            confidence: 0.95,
            sourceSpanStart: 0,
            sourceSpanEnd: 5,
            provenanceDetail: { source: "api-test" },
            payload: { name: segmentId.endsWith(":1") ? "Alice" : "Bob" }
          }
        ]
      })
    });

    const app = buildStoryGraphApi({
      ingestionSessionRepository: repository,
      storyRepository,
      ruleRepository,
      provenanceRepository,
      verdictRepository,
      verdictRunRepository,
      llmClient,
      generateId: () => "api-session",
      now: () => "2026-04-10T02:00:00Z"
    });

    const submitResponse = await app.inject({
      method: "POST",
      url: "/api/ingestion/submissions",
      payload: {
        submissionKind: "full_draft",
        text: "Scene One\nAlice wakes up.\n\nScene Two\nBob leaves.",
        draftTitle: "API Draft"
      }
    });

    expect(submitResponse.statusCode).toBe(201);
    const submitted = submitResponse.json();
    expect(submitted.workflowState).toBe("submitted");
    expect(submitted.segments).toHaveLength(2);

    const extractResponse = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/extract`,
      payload: {}
    });

    expect(extractResponse.statusCode).toBe(200);
    const extracted = extractResponse.json();
    expect(extracted.workflowState).toBe("needs_review");
    expect(extracted.segments[0].candidates[0].normalizedPayload).toBeNull();

    const firstPatchResponse = await app.inject({
      method: "PATCH",
      url: `/api/ingestion/submissions/${submitted.sessionId}/segments/${submitted.segments[0].segmentId}`,
      payload: {
        boundary: {
          label: "Revised Scene One",
          startOffset: 0,
          endOffset: 21
        },
        candidateCorrections: [
          {
            candidateId: extracted.segments[0].candidates[0].candidateId,
            correctedPayload: correctedCharacterPayload("Alice", submitted.sessionId)
          }
        ]
      }
    });

    expect(firstPatchResponse.statusCode).toBe(200);
    const patchedFirst = firstPatchResponse.json();
    expect(patchedFirst.workflowState).toBe("needs_review");
    expect(patchedFirst.segments[0].label).toBe("Revised Scene One");
    expect(patchedFirst.segments[0].candidates[0].correctedPayload.entityId).toBe("character:alice");

    const firstApproveResponse = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/segments/${submitted.segments[0].segmentId}/approve`
    });

    expect(firstApproveResponse.statusCode).toBe(200);
    const firstApproved = firstApproveResponse.json();
    expect(firstApproved.workflowState).toBe("partially_approved");

    const secondPatchResponse = await app.inject({
      method: "PATCH",
      url: `/api/ingestion/submissions/${submitted.sessionId}/segments/${submitted.segments[1].segmentId}`,
      payload: {
        candidateCorrections: [
          {
            candidateId: extracted.segments[1].candidates[0].candidateId,
            correctedPayload: correctedCharacterPayload("Bob", submitted.sessionId)
          }
        ]
      }
    });

    expect(secondPatchResponse.statusCode).toBe(200);

    const secondApproveResponse = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/segments/${submitted.segments[1].segmentId}/approve`
    });

    expect(secondApproveResponse.statusCode).toBe(200);
    const fullyApproved = secondApproveResponse.json();
    expect(fullyApproved.workflowState).toBe("approved");

    const readResponse = await app.inject({
      method: "GET",
      url: `/api/ingestion/submissions/${submitted.sessionId}`
    });

    expect(readResponse.statusCode).toBe(200);
    const readPayload = readResponse.json();
    expect(readPayload.workflowState).toBe("approved");
    expect(readPayload.segments[0].workflowState).toBe("approved");
    expect(readPayload.segments[1].workflowState).toBe("approved");

    await app.close();
  });

  it("serializes draft hierarchy and source refs for chapter-scale submissions", async () => {
    const llmClient = createConfiguredIngestionLlmClient({
      modelName: "test-model",
      extractor: async () => ({ candidates: [] })
    });

    const app = buildStoryGraphApi({
      ingestionSessionRepository: repository,
      storyRepository,
      ruleRepository,
      provenanceRepository,
      verdictRepository,
      verdictRunRepository,
      llmClient,
      generateId: () => "api-chapter",
      now: () => "2026-04-11T03:55:00Z"
    });

    const submitResponse = await app.inject({
      method: "POST",
      url: "/api/ingestion/submissions",
      payload: {
        submissionKind: "full_draft",
        text: "Chapter 1\r\nAlice waits.\r\n\r\nSection 2\r\nBob arrives.",
        storyId: "story:api-chapter",
        revisionId: "revision:api-chapter:1",
        draft: {
          documentId: "draft-document:api-chapter",
          draftRevisionId: "draft-revision:api-chapter:1",
          title: "API Chapter Draft"
        }
      }
    });

    expect(submitResponse.statusCode).toBe(201);
    const submitted = submitResponse.json();
    expect(submitted).toMatchObject({
      sessionId: "session:api-chapter",
      workflowState: "submitted",
      storyId: "story:api-chapter",
      revisionId: "revision:api-chapter:1"
    });
    expect(submitted.segments).toHaveLength(2);
    expect(submitted.draft.document.documentId).toBe("draft-document:api-chapter");
    expect(submitted.draft.revision.draftRevisionId).toBe("draft-revision:api-chapter:1");
    expect(submitted.sections[0].sectionKind).toBe("chapter");
    expect(submitted.scopes[0].scopeKind).toBe("full_approved_draft");
    expect(submitted.segments[0].draftPath.documentId).toBe("draft-document:api-chapter");
    expect(submitted.segments[0].sourceTextRef.textNormalization).toBe("lf");

    const readResponse = await app.inject({
      method: "GET",
      url: "/api/ingestion/submissions/session:api-chapter"
    });

    expect(readResponse.statusCode).toBe(200);
    const readPayload = readResponse.json();
    expect(readPayload.draft.document.documentId).toBe("draft-document:api-chapter");
    expect(readPayload.sections[0].sectionKind).toBe("chapter");
    expect(readPayload.scopes[0].scopeKind).toBe("full_approved_draft");
    expect(readPayload.segments[0].sourceTextRef.textNormalization).toBe("lf");

    await app.close();
  });

  it("keeps legacy chunk submit and read fields stable", async () => {
    const llmClient = createConfiguredIngestionLlmClient({
      modelName: "test-model",
      extractor: async () => ({ candidates: [] })
    });

    const app = buildStoryGraphApi({
      ingestionSessionRepository: repository,
      storyRepository,
      ruleRepository,
      provenanceRepository,
      verdictRepository,
      verdictRunRepository,
      llmClient,
      generateId: () => "api-legacy-chunk",
      now: () => "2026-04-11T03:56:00Z"
    });

    const submitResponse = await app.inject({
      method: "POST",
      url: "/api/ingestion/submissions",
      payload: {
        submissionKind: "chunk",
        text: "Alice waits.",
        draftTitle: "Legacy Chunk Draft"
      }
    });

    expect(submitResponse.statusCode).toBe(201);
    const submitted = submitResponse.json();
    expect(submitted).toMatchObject({
      sessionId: "session:api-legacy-chunk",
      workflowState: "submitted",
      storyId: "story:draft:session:api-legacy-chunk",
      revisionId: "revision:draft:session:api-legacy-chunk"
    });
    expect(submitted.segments).toHaveLength(1);
    expect(submitted.segments[0].label).toBe("Chunk 1");
    expect(submitted.draft.document.documentId).toBe("draft-document:session:api-legacy-chunk");

    const readResponse = await app.inject({
      method: "GET",
      url: "/api/ingestion/submissions/session:api-legacy-chunk"
    });

    expect(readResponse.statusCode).toBe(200);
    const readPayload = readResponse.json();
    expect(readPayload).toMatchObject({
      sessionId: "session:api-legacy-chunk",
      workflowState: "submitted",
      storyId: "story:draft:session:api-legacy-chunk",
      revisionId: "revision:draft:session:api-legacy-chunk"
    });
    expect(readPayload.segments).toHaveLength(1);
    expect(readPayload.draft.document.documentId).toBe("draft-document:session:api-legacy-chunk");

    await app.close();
  });

  it("serializes selected extract responses with attempt history and progress summary", async () => {
    let retryMode: "initial" | "retry-fail" = "initial";
    const llmClient = createConfiguredIngestionLlmClient({
      modelName: "test-model",
      extractor: async ({ segmentId }) => {
        if (retryMode === "retry-fail" && segmentId.endsWith(":1")) {
          throw new Error("Extractor failure for segment 1 that should surface in retry metadata.");
        }

        const name = segmentId.endsWith(":1") ? "Alice" : "Bob";
        return {
          candidates: [
            {
              candidateId: `${segmentId}:${retryMode}`,
              candidateKind: "entity",
              canonicalKey: `entity:${name.toLowerCase()}`,
              confidence: 0.95,
              sourceSpanStart: 0,
              sourceSpanEnd: name.length,
              provenanceDetail: { retryMode },
              payload: correctedCharacterPayload(name, "session:incremental")
            }
          ]
        };
      }
    });

    const app = buildStoryGraphApi({
      ingestionSessionRepository: repository,
      storyRepository,
      ruleRepository,
      provenanceRepository,
      verdictRepository,
      verdictRunRepository,
      llmClient,
      generateId: () => "incremental",
      now: () => "2026-04-11T06:40:00Z"
    });

    const submitResponse = await app.inject({
      method: "POST",
      url: "/api/ingestion/submissions",
      payload: {
        sessionId: "session:incremental",
        submissionKind: "full_draft",
        text: "Alice waits.\n\nBob leaves.",
        storyId: "story:incremental",
        revisionId: "revision:incremental:1"
      }
    });

    expect(submitResponse.statusCode).toBe(201);
    const submitted = submitResponse.json();

    const fullExtractResponse = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/extract`,
      payload: {}
    });

    expect(fullExtractResponse.statusCode).toBe(200);

    const approveResponse = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/segments/segment:session:incremental:2/approve`
    });

    expect(approveResponse.statusCode).toBe(200);
    const approved = approveResponse.json();
    const approvedAt = approved.segments[1].approvedAt;

    retryMode = "retry-fail";
    const retryResponse = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/extract`,
      payload: {
        segmentIds: ["segment:session:incremental:1"],
        allowApprovalReset: true
      }
    });

    expect(retryResponse.statusCode).toBe(200);
    const retried = retryResponse.json();
    expect(retried.progressSummary.totalSegments).toBe(2);
    expect(retried.progressSummary.failedSegments).toBe(1);
    expect(retried.segments[1].approvedAt).toBe(approvedAt);
    expect(retried.segments[0].attempts.map((attempt: { status: string }) => attempt.status)).toEqual([
      "success",
      "failed"
    ]);

    await app.close();
  });

  it("retries approved targets only when allowApprovalReset is true", async () => {
    const llmClient = createConfiguredIngestionLlmClient({
      modelName: "test-model",
      extractor: async ({ segmentId }) => {
        const name = segmentId.endsWith(":1") ? "Alice" : "Bob";
        return {
          candidates: [
            {
              candidateId: `${segmentId}:retry`,
              candidateKind: "entity",
              canonicalKey: `entity:${name.toLowerCase()}`,
              confidence: 0.95,
              sourceSpanStart: 0,
              sourceSpanEnd: name.length,
              provenanceDetail: { source: "retry-test" },
              payload: correctedCharacterPayload(name, "session:approved-retry")
            }
          ]
        };
      }
    });

    const app = buildStoryGraphApi({
      ingestionSessionRepository: repository,
      storyRepository,
      ruleRepository,
      provenanceRepository,
      verdictRepository,
      verdictRunRepository,
      llmClient,
      generateId: () => "approved-retry",
      now: () => "2026-04-11T07:20:00Z"
    });

    const submitResponse = await app.inject({
      method: "POST",
      url: "/api/ingestion/submissions",
      payload: {
        sessionId: "session:approved-retry",
        submissionKind: "full_draft",
        text: "Alice waits.\n\nBob leaves.",
        draftTitle: "Approved Retry Draft"
      }
    });
    expect(submitResponse.statusCode).toBe(201);
    const submitted = submitResponse.json();

    const extractResponse = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/extract`,
      payload: {}
    });
    expect(extractResponse.statusCode).toBe(200);

    const approveResponse = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/segments/segment:session:approved-retry:2/approve`
    });
    expect(approveResponse.statusCode).toBe(200);
    const approvedAt = approveResponse.json().segments[1].approvedAt;

    const blockedRetry = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/extract`,
      payload: {
        segmentIds: ["segment:session:approved-retry:2"],
        allowApprovalReset: false
      }
    });
    expect(blockedRetry.statusCode).toBe(409);
    expect(blockedRetry.json().message).toContain("allowApprovalReset=true");

    const reopenedRetry = await app.inject({
      method: "POST",
      url: `/api/ingestion/submissions/${submitted.sessionId}/extract`,
      payload: {
        segmentIds: ["segment:session:approved-retry:2"],
        allowApprovalReset: true
      }
    });
    expect(reopenedRetry.statusCode).toBe(200);
    const reopened = reopenedRetry.json();
    expect(reopened.segments[0].approvedAt).toBeNull();
    expect(reopened.segments[1].approvedAt).toBeNull();
    expect(reopened.segments[1].stale).toBe(true);
    expect(reopened.segments[1].staleReason).toBe("reextracted");
    expect(approvedAt).not.toBeNull();

    await app.close();
  });
});
