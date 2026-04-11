import {
  CanonicalEntitySchema,
  CanonicalEventSchema,
  CausalLinkSchema,
  CharacterStateBoundarySchema,
  DraftCheckScopeSchema,
  DraftDocumentSchema,
  DraftRevisionSchema,
  DraftSectionSchema,
  DraftSubmissionPlanSchema,
  IngestionAttemptStatusSchema,
  IngestionCandidateRecordSchema,
  IngestionProgressSummarySchema,
  IngestionSessionRecordSchema,
  IngestionSessionSnapshotSchema,
  IngestionSegmentAttemptRecordSchema,
  IngestionSegmentRecordSchema,
  IngestionWorkflowStateSchema,
  ReviewSegmentPatchSchema,
  RuleCandidateNormalizedPayloadSchema,
  SegmentApprovalResultSchema,
  StructuredExtractionBatchSchema,
  type IngestionCandidateRecord,
  type IngestionProgressSummary,
  type IngestionSessionRecord,
  type IngestionSessionRecordInput,
  type IngestionSegmentAttemptRecord,
  type IngestionSegmentSnapshot,
  type IngestionSessionSnapshot,
  type IngestionWorkflowState,
  type ReviewSegmentPatch,
  type SegmentApprovalResult,
  type StructuredExtractionBatch,
  type DraftSubmissionPlan
} from "../../domain/index.js";
import { asJson, withTransaction, type SqlQueryable } from "../db.js";

type SessionRow = {
  sessionId: string;
  storyId: string | null;
  revisionId: string | null;
  draftTitle: string;
  draftDocumentId: string | null;
  draftRevisionId: string | null;
  defaultRulePackName: string;
  inputKind: string;
  rawText: string;
  workflowState: string;
  promptFamily: string;
  modelName: string;
  lastVerdictRunId: string | null;
  createdAt: string;
  updatedAt: string;
  lastCheckedAt: string | null;
};

type SegmentRow = {
  segmentId: string;
  sessionId: string;
  sequence: number;
  label: string;
  startOffset: number;
  endOffset: number;
  segmentText: string;
  draftRevisionId: string | null;
  sectionId: string | null;
  draftPath: unknown | null;
  sourceTextRef: unknown | null;
  workflowState: string;
  approvedAt: string | null;
  attemptCount: number;
  lastExtractionAt: string | null;
  lastAttemptStatus: string | null;
  lastFailureSummary: string | null;
  stale: boolean;
  staleReason: string | null;
  currentAttemptId: string | null;
};

type AttemptRow = {
  attemptId: string;
  sessionId: string;
  segmentId: string;
  attemptNumber: number;
  requestKind: string;
  status: string;
  invalidatedApproval: boolean;
  startedAt: string;
  finishedAt: string | null;
  errorSummary: string | null;
};

type DraftRevisionJoinRow = {
  draftRevisionId: string;
  documentId: string;
  storyId: string;
  revisionId: string;
  basedOnDraftRevisionId: string | null;
  createdAt: string;
  title: string;
  documentCreatedAt: string;
  documentUpdatedAt: string;
};

type DraftSectionRow = {
  sectionId: string;
  draftRevisionId: string;
  sectionKind: string;
  sequence: number;
  label: string;
  sourceTextRef: unknown;
};

type DraftCheckScopeRow = {
  scopeId: string;
  scopeKind: string;
  payload: unknown;
};

type CandidateRow = {
  candidateId: string;
  sessionId: string;
  segmentId: string;
  candidateKind: string;
  canonicalKey: string;
  confidence: number;
  reviewNeeded: boolean;
  reviewNeededReason: string | null;
  sourceSpanStart: number;
  sourceSpanEnd: number;
  provenanceDetail: Record<string, unknown>;
  extractedPayload: unknown;
  correctedPayload: unknown | null;
  normalizedPayload: unknown | null;
};

type SessionStateUpdate = {
  lastCheckedAt?: string | null;
  lastVerdictRunId?: string | null;
  updatedAt?: string;
};

function parseSessionRow(row: SessionRow): IngestionSessionRecord {
  return IngestionSessionRecordSchema.parse(row);
}

function parseSegmentRow(row: SegmentRow) {
  return IngestionSegmentRecordSchema.parse(row);
}

function parseAttemptRow(row: AttemptRow): IngestionSegmentAttemptRecord {
  return IngestionSegmentAttemptRecordSchema.parse(row);
}

function parseCandidateRow(row: CandidateRow): IngestionCandidateRecord {
  return IngestionCandidateRecordSchema.parse(row);
}

function buildCompatibilityDraft(session: IngestionSessionRecord) {
  const documentId = session.draftDocumentId ?? `draft-document:${session.sessionId}`;
  const storyId = session.storyId ?? `story:draft:${session.sessionId}`;
  const draftRevisionId = session.draftRevisionId ?? `draft-revision:${session.sessionId}`;
  const revisionId = session.revisionId ?? `revision:draft:${session.sessionId}`;

  return {
    document: DraftDocumentSchema.parse({
      documentId,
      storyId,
      title: session.draftTitle,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    }),
    revision: DraftRevisionSchema.parse({
      draftRevisionId,
      documentId,
      storyId,
      revisionId,
      basedOnDraftRevisionId: null,
      createdAt: session.createdAt
    })
  };
}

function parseDraftSectionRow(row: DraftSectionRow) {
  return DraftSectionSchema.parse({
    sectionId: row.sectionId,
    draftRevisionId: row.draftRevisionId,
    sectionKind: row.sectionKind,
    sequence: row.sequence,
    label: row.label,
    sourceTextRef: row.sourceTextRef
  });
}

function parseDraftCheckScopeRow(row: DraftCheckScopeRow) {
  return DraftCheckScopeSchema.parse(row.payload);
}

function normalizeCandidatePayload(candidate: IngestionCandidateRecord, payload: unknown) {
  switch (candidate.candidateKind) {
    case "entity":
      return CanonicalEntitySchema.parse(payload);
    case "state_boundary":
      return CharacterStateBoundarySchema.parse(payload);
    case "event":
      return CanonicalEventSchema.parse(payload);
    case "causal_link":
      return CausalLinkSchema.parse(payload);
    case "rule":
      return RuleCandidateNormalizedPayloadSchema.parse(payload);
  }
}

function computeSessionWorkflowState(snapshot: IngestionSessionSnapshot): IngestionWorkflowState {
  const approvedSegments = snapshot.segments.filter(
    ({ segment }) => segment.workflowState === "approved" || segment.approvedAt
  );
  const failedSegments = snapshot.segments.filter(
    ({ segment }) =>
      segment.workflowState === "failed" ||
      segment.workflowState === "partial_failure" ||
      segment.lastAttemptStatus === "failed"
  );

  if (approvedSegments.length === snapshot.segments.length && snapshot.segments.length > 0) {
    if (snapshot.session.workflowState === "checked" && snapshot.session.lastCheckedAt) {
      return "checked";
    }

    return "approved";
  }

  if (failedSegments.length > 0) {
    if (
      approvedSegments.length > 0 ||
      snapshot.segments.some(
        ({ segment }) => segment.workflowState === "needs_review" || segment.workflowState === "extracted"
      )
    ) {
      return "partial_failure";
    }

    return "failed";
  }

  if (approvedSegments.length > 0) {
    return "partially_approved";
  }

  if (snapshot.segments.some(({ segment }) => segment.workflowState === "needs_review")) {
    return "needs_review";
  }

  if (snapshot.segments.some(({ segment }) => segment.workflowState === "extracting")) {
    return "extracting";
  }

  if (snapshot.segments.some(({ segment }) => segment.workflowState === "extracted")) {
    return "extracted";
  }

  return "submitted";
}

function computeProgressSummary(segments: IngestionSegmentSnapshot[]): IngestionProgressSummary {
  return IngestionProgressSummarySchema.parse({
    totalSegments: segments.length,
    submittedSegments: segments.filter(({ segment }) => segment.workflowState === "submitted").length,
    extractedSegments: segments.filter(
      ({ segment, candidates, attempts }) =>
        segment.lastAttemptStatus === "success" ||
        attempts.some((attempt) => attempt.status === "success") ||
        candidates.length > 0
    ).length,
    needsReviewSegments: segments.filter(({ segment }) => segment.workflowState === "needs_review").length,
    approvedSegments: segments.filter(
      ({ segment }) => segment.workflowState === "approved" || Boolean(segment.approvedAt)
    ).length,
    failedSegments: segments.filter(
      ({ segment }) => segment.workflowState === "failed" || segment.lastAttemptStatus === "failed"
    ).length,
    staleSegments: segments.filter(({ segment }) => segment.stale).length
  });
}

function assertSegmentBatchConsistency(batch: StructuredExtractionBatch): void {
  for (const segment of batch.segments) {
    for (const candidate of segment.candidates) {
      if (candidate.sessionId !== batch.sessionId) {
        throw new Error(`Candidate ${candidate.candidateId} does not belong to session ${batch.sessionId}`);
      }

      if (candidate.segmentId !== segment.segmentId) {
        throw new Error(`Candidate ${candidate.candidateId} does not belong to segment ${segment.segmentId}`);
      }
    }
  }
}

export class IngestionSessionRepository {
  constructor(private readonly client: SqlQueryable) {}

  async createSession(input: IngestionSessionRecordInput): Promise<IngestionSessionRecord> {
    const session = IngestionSessionRecordSchema.parse(input);

    await this.client.query(
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (session_id) DO UPDATE SET
          story_id = EXCLUDED.story_id,
          revision_id = EXCLUDED.revision_id,
          draft_title = EXCLUDED.draft_title,
          draft_document_id = EXCLUDED.draft_document_id,
          draft_revision_id = EXCLUDED.draft_revision_id,
          default_rule_pack_name = EXCLUDED.default_rule_pack_name,
          input_kind = EXCLUDED.input_kind,
          raw_text = EXCLUDED.raw_text,
          workflow_state = EXCLUDED.workflow_state,
          prompt_family = EXCLUDED.prompt_family,
          model_name = EXCLUDED.model_name,
          last_verdict_run_id = EXCLUDED.last_verdict_run_id,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at,
          last_checked_at = EXCLUDED.last_checked_at
      `,
      [
        session.sessionId,
        session.storyId ?? null,
        session.revisionId ?? null,
        session.draftTitle,
        session.draftDocumentId ?? null,
        session.draftRevisionId ?? null,
        session.defaultRulePackName,
        session.inputKind,
        session.rawText,
        session.workflowState,
        session.promptFamily,
        session.modelName,
        session.lastVerdictRunId ?? null,
        session.createdAt,
        session.updatedAt,
        session.lastCheckedAt ?? null
      ]
    );

    return session;
  }

  async saveDraftPlan(sessionIdInput: string, planInput: DraftSubmissionPlan): Promise<void> {
    const sessionId = IngestionSessionRecordSchema.shape.sessionId.parse(sessionIdInput);
    const plan = DraftSubmissionPlanSchema.parse(planInput);

    for (const entry of plan.segments) {
      if (entry.segment.sessionId !== sessionId || entry.sourceTextRef.sessionId !== sessionId) {
        throw new Error(`Draft plan segment ${entry.segment.segmentId} does not belong to session ${sessionId}`);
      }
    }

    await withTransaction(this.client, async () => {
      const sessionUpdate = await this.client.query(
        `
          UPDATE ingestion_sessions
          SET draft_document_id = $2,
              draft_revision_id = $3,
              updated_at = $4
          WHERE session_id = $1
        `,
        [
          sessionId,
          plan.document.documentId,
          plan.revision.draftRevisionId,
          plan.document.updatedAt
        ]
      );

      if (!sessionUpdate.rowCount) {
        throw new Error(`Ingestion session not found: ${sessionId}`);
      }

      await this.client.query(
        `
          INSERT INTO draft_documents (
            document_id,
            story_id,
            title,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (document_id) DO UPDATE SET
            story_id = EXCLUDED.story_id,
            title = EXCLUDED.title,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at
        `,
        [
          plan.document.documentId,
          plan.document.storyId,
          plan.document.title,
          plan.document.createdAt,
          plan.document.updatedAt
        ]
      );

      await this.client.query(
        `
          INSERT INTO draft_revisions (
            draft_revision_id,
            document_id,
            story_id,
            revision_id,
            based_on_draft_revision_id,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (draft_revision_id) DO UPDATE SET
            document_id = EXCLUDED.document_id,
            story_id = EXCLUDED.story_id,
            revision_id = EXCLUDED.revision_id,
            based_on_draft_revision_id = EXCLUDED.based_on_draft_revision_id,
            created_at = EXCLUDED.created_at
        `,
        [
          plan.revision.draftRevisionId,
          plan.revision.documentId,
          plan.revision.storyId,
          plan.revision.revisionId,
          plan.revision.basedOnDraftRevisionId ?? null,
          plan.revision.createdAt
        ]
      );

      await this.client.query(
        `
          DELETE FROM draft_sections
          WHERE draft_revision_id = $1
        `,
        [plan.revision.draftRevisionId]
      );

      for (const section of plan.sections) {
        await this.client.query(
          `
            INSERT INTO draft_sections (
              section_id,
              draft_revision_id,
              section_kind,
              sequence,
              label,
              source_text_ref
            )
            VALUES ($1, $2, $3, $4, $5, CAST($6 AS jsonb))
          `,
          [
            section.sectionId,
            section.draftRevisionId,
            section.sectionKind,
            section.sequence,
            section.label,
            asJson(section.sourceTextRef)
          ]
        );
      }

      await this.client.query(
        `
          DELETE FROM draft_check_scopes
          WHERE session_id = $1
        `,
        [sessionId]
      );

      for (const scope of plan.checkScopes) {
        await this.client.query(
          `
            INSERT INTO draft_check_scopes (
              scope_id,
              session_id,
              draft_revision_id,
              scope_kind,
              payload,
              created_at
            )
            VALUES ($1, $2, $3, $4, CAST($5 AS jsonb), $6)
          `,
          [
            scope.scopeId,
            sessionId,
            plan.revision.draftRevisionId,
            scope.scopeKind,
            asJson(scope),
            plan.revision.createdAt
          ]
        );
      }
    });
  }

  async saveSegments(input: IngestionSessionRecord["sessionId"], segmentsInput: unknown[]): Promise<void> {
    const sessionId = IngestionSessionRecordSchema.shape.sessionId.parse(input);
    const segments = segmentsInput.map((segment) => {
      const parsed = IngestionSegmentRecordSchema.parse(segment);
      if (parsed.sessionId !== sessionId) {
        throw new Error(`Segment ${parsed.segmentId} does not belong to session ${sessionId}`);
      }
      return parsed;
    });

    await withTransaction(this.client, async () => {
      for (const segment of segments) {
        await this.client.query(
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
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CAST($10 AS jsonb), CAST($11 AS jsonb), $12, $13)
            ON CONFLICT (segment_id) DO UPDATE SET
              session_id = EXCLUDED.session_id,
              sequence = EXCLUDED.sequence,
              label = EXCLUDED.label,
              start_offset = EXCLUDED.start_offset,
              end_offset = EXCLUDED.end_offset,
              segment_text = EXCLUDED.segment_text,
              draft_revision_id = EXCLUDED.draft_revision_id,
              section_id = EXCLUDED.section_id,
              draft_path = EXCLUDED.draft_path,
              source_text_ref = EXCLUDED.source_text_ref,
              workflow_state = EXCLUDED.workflow_state,
              approved_at = EXCLUDED.approved_at
          `,
          [
            segment.segmentId,
            segment.sessionId,
            segment.sequence,
            segment.label,
            segment.startOffset,
            segment.endOffset,
            segment.segmentText,
            segment.draftRevisionId ?? null,
            segment.sectionId ?? null,
            asJson(segment.draftPath),
            asJson(segment.sourceTextRef),
            segment.workflowState,
            segment.approvedAt ?? null
          ]
        );
      }
    });
  }

  async saveExtractionBatch(input: StructuredExtractionBatch): Promise<void> {
    const batch = StructuredExtractionBatchSchema.parse(input);
    assertSegmentBatchConsistency(batch);

    await withTransaction(this.client, async () => {
      for (const segment of batch.segments) {
        const attempt = segment.attempt ? IngestionSegmentAttemptRecordSchema.parse(segment.attempt) : null;
        const updated = await this.client.query(
          `
            UPDATE ingestion_segments
            SET workflow_state = $2,
                approved_at = CASE WHEN $4 THEN NULL ELSE approved_at END,
                attempt_count = CASE WHEN $5 IS NULL THEN attempt_count ELSE $5 END,
                last_extraction_at = CASE WHEN $6 IS NULL THEN last_extraction_at ELSE $6 END,
                last_attempt_status = CASE WHEN $7 IS NULL THEN last_attempt_status ELSE $7 END,
                last_failure_summary = CASE
                  WHEN $7 = 'success' THEN NULL
                  WHEN $8 IS NULL THEN last_failure_summary
                  ELSE $8
                END,
                stale = CASE WHEN $4 THEN TRUE ELSE FALSE END,
                stale_reason = CASE WHEN $4 THEN 'reextracted' ELSE NULL END,
                current_attempt_id = CASE WHEN $9 IS NULL THEN current_attempt_id ELSE $9 END
            WHERE session_id = $1 AND segment_id = $3
          `,
          [
            batch.sessionId,
            segment.workflowState,
            segment.segmentId,
            attempt?.invalidatedApproval ?? false,
            attempt?.attemptNumber ?? null,
            attempt?.finishedAt ?? attempt?.startedAt ?? null,
            attempt ? IngestionAttemptStatusSchema.parse(attempt.status) : null,
            attempt?.errorSummary ?? null,
            attempt?.attemptId ?? null
          ]
        );

        if (!updated.rowCount) {
          throw new Error(`Segment ${segment.segmentId} does not exist for session ${batch.sessionId}`);
        }

        if (attempt) {
          await this.client.query(
            `
              INSERT INTO ingestion_segment_attempts (
                attempt_id,
                session_id,
                segment_id,
                attempt_number,
                request_kind,
                status,
                invalidated_approval,
                started_at,
                finished_at,
                error_summary,
                candidate_snapshot
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CAST($11 AS jsonb))
            `,
            [
              attempt.attemptId,
              batch.sessionId,
              segment.segmentId,
              attempt.attemptNumber,
              attempt.requestKind,
              attempt.status,
              attempt.invalidatedApproval,
              attempt.startedAt,
              attempt.finishedAt ?? null,
              attempt.errorSummary ?? null,
              asJson(segment.candidates)
            ]
          );
        }

        if (!attempt || attempt.status === "success") {
          await this.client.query(
            `
              DELETE FROM ingestion_candidates
              WHERE session_id = $1 AND segment_id = $2
            `,
            [batch.sessionId, segment.segmentId]
          );

          for (const candidate of segment.candidates) {
            await this.client.query(
              `
                INSERT INTO ingestion_candidates (
                  candidate_id,
                  session_id,
                  segment_id,
                  candidate_kind,
                  canonical_key,
                  confidence,
                  review_needed,
                  review_needed_reason,
                  source_span_start,
                  source_span_end,
                  provenance_detail,
                  extracted_payload,
                  corrected_payload,
                  normalized_payload
                )
                VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                  CAST($11 AS jsonb),
                  CAST($12 AS jsonb),
                  CAST($13 AS jsonb),
                  CAST($14 AS jsonb)
                )
              `,
              [
                candidate.candidateId,
                candidate.sessionId,
                candidate.segmentId,
                candidate.candidateKind,
                candidate.canonicalKey,
                candidate.confidence,
                candidate.reviewNeeded,
                candidate.reviewNeededReason ?? null,
                candidate.sourceSpanStart,
                candidate.sourceSpanEnd,
                asJson(candidate.provenanceDetail),
                asJson(candidate.extractedPayload),
                asJson(candidate.correctedPayload),
                asJson(candidate.normalizedPayload)
              ]
            );
          }
        }
      }
    });
  }

  async loadSessionSnapshot(sessionIdInput: string): Promise<IngestionSessionSnapshot> {
    const sessionId = IngestionSessionRecordSchema.shape.sessionId.parse(sessionIdInput);
    const sessionRow = (
      await this.client.query<SessionRow>(
        `
          SELECT
            session_id AS "sessionId",
            story_id AS "storyId",
            revision_id AS "revisionId",
            draft_title AS "draftTitle",
            draft_document_id AS "draftDocumentId",
            draft_revision_id AS "draftRevisionId",
            default_rule_pack_name AS "defaultRulePackName",
            input_kind AS "inputKind",
            raw_text AS "rawText",
            workflow_state AS "workflowState",
            prompt_family AS "promptFamily",
            model_name AS "modelName",
            last_verdict_run_id AS "lastVerdictRunId",
            created_at AS "createdAt",
            updated_at AS "updatedAt",
            last_checked_at AS "lastCheckedAt"
          FROM ingestion_sessions
          WHERE session_id = $1
        `,
        [sessionId]
      )
    ).rows[0];

    if (!sessionRow) {
      throw new Error(`Ingestion session not found: ${sessionId}`);
    }

    const segmentRows = (
      await this.client.query<SegmentRow>(
        `
          SELECT
            segment_id AS "segmentId",
            session_id AS "sessionId",
            sequence,
            label,
            start_offset AS "startOffset",
            end_offset AS "endOffset",
            segment_text AS "segmentText",
            draft_revision_id AS "draftRevisionId",
            section_id AS "sectionId",
            draft_path AS "draftPath",
            source_text_ref AS "sourceTextRef",
            workflow_state AS "workflowState",
            approved_at AS "approvedAt",
            attempt_count AS "attemptCount",
            last_extraction_at AS "lastExtractionAt",
            last_attempt_status AS "lastAttemptStatus",
            last_failure_summary AS "lastFailureSummary",
            stale,
            stale_reason AS "staleReason",
            current_attempt_id AS "currentAttemptId"
          FROM ingestion_segments
          WHERE session_id = $1
          ORDER BY sequence, segment_id
        `,
        [sessionId]
      )
    ).rows;

    const attemptRows = (
      await this.client.query<AttemptRow>(
        `
          SELECT
            attempt_id AS "attemptId",
            session_id AS "sessionId",
            segment_id AS "segmentId",
            attempt_number AS "attemptNumber",
            request_kind AS "requestKind",
            status,
            invalidated_approval AS "invalidatedApproval",
            started_at AS "startedAt",
            finished_at AS "finishedAt",
            error_summary AS "errorSummary"
          FROM ingestion_segment_attempts
          WHERE session_id = $1
          ORDER BY segment_id, attempt_number
        `,
        [sessionId]
      )
    ).rows;

    const candidateRows = (
      await this.client.query<CandidateRow>(
        `
          SELECT
            candidate_id AS "candidateId",
            session_id AS "sessionId",
            segment_id AS "segmentId",
            candidate_kind AS "candidateKind",
            canonical_key AS "canonicalKey",
            confidence,
            review_needed AS "reviewNeeded",
            review_needed_reason AS "reviewNeededReason",
            source_span_start AS "sourceSpanStart",
            source_span_end AS "sourceSpanEnd",
            provenance_detail AS "provenanceDetail",
            extracted_payload AS "extractedPayload",
            corrected_payload AS "correctedPayload",
            normalized_payload AS "normalizedPayload"
          FROM ingestion_candidates
          WHERE session_id = $1
          ORDER BY segment_id, candidate_id
        `,
        [sessionId]
      )
    ).rows;

    const parsedSession = parseSessionRow(sessionRow);
    const compatibilityDraft = buildCompatibilityDraft(parsedSession);
    const draftRevisionIdForLookup =
      sessionRow.draftRevisionId ?? compatibilityDraft.revision.draftRevisionId;

    const storedDraftRow = (
      await this.client.query<DraftRevisionJoinRow>(
        `
          SELECT
            dr.draft_revision_id AS "draftRevisionId",
            dr.document_id AS "documentId",
            dr.story_id AS "storyId",
            dr.revision_id AS "revisionId",
            dr.based_on_draft_revision_id AS "basedOnDraftRevisionId",
            dr.created_at AS "createdAt",
            dd.title,
            dd.created_at AS "documentCreatedAt",
            dd.updated_at AS "documentUpdatedAt"
          FROM draft_revisions dr
          JOIN draft_documents dd ON dd.document_id = dr.document_id
          WHERE dr.draft_revision_id = $1
        `,
        [draftRevisionIdForLookup]
      )
    ).rows[0];

    const draftDocument = storedDraftRow
      ? DraftDocumentSchema.parse({
          documentId: storedDraftRow.documentId,
          storyId: storedDraftRow.storyId,
          title: storedDraftRow.title,
          createdAt: storedDraftRow.documentCreatedAt,
          updatedAt: storedDraftRow.documentUpdatedAt
        })
      : compatibilityDraft.document;
    const draftRevision = storedDraftRow
      ? DraftRevisionSchema.parse({
          draftRevisionId: storedDraftRow.draftRevisionId,
          documentId: storedDraftRow.documentId,
          storyId: storedDraftRow.storyId,
          revisionId: storedDraftRow.revisionId,
          basedOnDraftRevisionId: storedDraftRow.basedOnDraftRevisionId,
          createdAt: storedDraftRow.createdAt
        })
      : compatibilityDraft.revision;

    const draftSectionRows = (
      await this.client.query<DraftSectionRow>(
        `
          SELECT
            section_id AS "sectionId",
            draft_revision_id AS "draftRevisionId",
            section_kind AS "sectionKind",
            sequence,
            label,
            source_text_ref AS "sourceTextRef"
          FROM draft_sections
          WHERE draft_revision_id = $1
          ORDER BY sequence, section_id
        `,
        [draftRevision.draftRevisionId]
      )
    ).rows;

    const draftCheckScopeRows = (
      await this.client.query<DraftCheckScopeRow>(
        `
          SELECT
            scope_id AS "scopeId",
            scope_kind AS "scopeKind",
            payload
          FROM draft_check_scopes
          WHERE session_id = $1
          ORDER BY scope_id
        `,
        [sessionId]
      )
    ).rows;

    const candidatesBySegment = new Map<string, IngestionCandidateRecord[]>();
    for (const row of candidateRows) {
      const parsed = parseCandidateRow(row);
      const existing = candidatesBySegment.get(parsed.segmentId) ?? [];
      existing.push(parsed);
      candidatesBySegment.set(parsed.segmentId, existing);
    }

    const attemptsBySegment = new Map<string, IngestionSegmentAttemptRecord[]>();
    for (const row of attemptRows) {
      const parsed = parseAttemptRow(row);
      const existing = attemptsBySegment.get(row.segmentId) ?? [];
      existing.push(parsed);
      attemptsBySegment.set(row.segmentId, existing);
    }

    const segments = segmentRows.map((row) => {
      const segment = parseSegmentRow(row);
      return {
        segment,
        candidates: candidatesBySegment.get(segment.segmentId) ?? [],
        attempts: attemptsBySegment.get(segment.segmentId) ?? []
      };
    });

    return IngestionSessionSnapshotSchema.parse({
      session: {
        ...parsedSession,
        draftDocumentId: draftDocument.documentId,
        draftRevisionId: draftRevision.draftRevisionId,
        draft: {
          document: draftDocument,
          revision: draftRevision
        }
      },
      segments,
      draftSections: draftSectionRows.map(parseDraftSectionRow),
      checkScopes: draftCheckScopeRows.map(parseDraftCheckScopeRow),
      progressSummary: computeProgressSummary(segments)
    });
  }

  async applySegmentPatch(
    sessionIdInput: string,
    segmentIdInput: string,
    patchInput: ReviewSegmentPatch,
    options: { updatedAt?: string } = {}
  ): Promise<IngestionSessionSnapshot> {
    const sessionId = IngestionSessionRecordSchema.shape.sessionId.parse(sessionIdInput);
    const segmentId = IngestionSegmentRecordSchema.shape.segmentId.parse(segmentIdInput);
    const patch = ReviewSegmentPatchSchema.parse(patchInput);
    const updatedAt = options.updatedAt ?? new Date().toISOString();
    const snapshot = await this.loadSessionSnapshot(sessionId);
    const segmentSnapshot = snapshot.segments.find(({ segment }) => segment.segmentId === segmentId);

    if (!segmentSnapshot) {
      throw new Error(`Segment ${segmentId} does not exist for session ${sessionId}`);
    }

    const candidateById = new Map(
      segmentSnapshot.candidates.map((candidate) => [candidate.candidateId, candidate] as const)
    );

    const nextLabel = patch.boundary?.label ?? segmentSnapshot.segment.label;
    const nextStartOffset = patch.boundary?.startOffset ?? segmentSnapshot.segment.startOffset;
    const nextEndOffset = patch.boundary?.endOffset ?? segmentSnapshot.segment.endOffset;
    const nextSourceTextRef =
      segmentSnapshot.segment.sourceTextRef ||
      segmentSnapshot.segment.draftRevisionId ||
      segmentSnapshot.segment.sectionId ||
      segmentSnapshot.segment.draftPath
        ? {
            sourceKind: "ingestion_session_raw_text" as const,
            sessionId,
            startOffset: nextStartOffset,
            endOffset: nextEndOffset,
            textNormalization: "lf" as const
          }
        : null;

    if (nextStartOffset > nextEndOffset) {
      throw new Error(`Segment ${segmentId} has an invalid boundary patch.`);
    }

    await withTransaction(this.client, async () => {
      await this.client.query(
        `
          UPDATE ingestion_segments
          SET label = $3,
              start_offset = $4,
              end_offset = $5,
              workflow_state = $6,
              source_text_ref = CAST($7 AS jsonb)
          WHERE session_id = $1 AND segment_id = $2
        `,
        [
          sessionId,
          segmentId,
          nextLabel,
          nextStartOffset,
          nextEndOffset,
          segmentSnapshot.segment.approvedAt ? "approved" : "needs_review",
          asJson(nextSourceTextRef)
        ]
      );

      for (const correction of patch.candidateCorrections) {
        const candidate = candidateById.get(correction.candidateId);
        if (!candidate) {
          throw new Error(`Candidate ${correction.candidateId} does not belong to segment ${segmentId}`);
        }

        let normalizedPayload: unknown = null;
        try {
          normalizedPayload = normalizeCandidatePayload(candidate, correction.correctedPayload);
        } catch {
          normalizedPayload = null;
        }

        const reviewNeeded = candidate.reviewNeeded || normalizedPayload === null;
        const reviewNeededReason =
          normalizedPayload === null ? "normalization_failed" : candidate.reviewNeededReason ?? null;

        await this.client.query(
          `
            UPDATE ingestion_candidates
            SET corrected_payload = CAST($4 AS jsonb),
                normalized_payload = CAST($5 AS jsonb),
                review_needed = $6,
                review_needed_reason = $7
            WHERE session_id = $1 AND segment_id = $2 AND candidate_id = $3
          `,
          [
            sessionId,
            segmentId,
            candidate.candidateId,
            asJson(correction.correctedPayload),
            asJson(normalizedPayload),
            reviewNeeded,
            reviewNeededReason
          ]
        );
      }

      await this.client.query(
        `
          UPDATE ingestion_sessions
          SET updated_at = $2
          WHERE session_id = $1
        `,
        [sessionId, updatedAt]
      );
    });

    await this.recalculateSessionState(sessionId, { updatedAt });
    return this.loadSessionSnapshot(sessionId);
  }

  async approveSegment(
    sessionIdInput: string,
    segmentIdInput: string,
    options: { approvedAt?: string; updatedAt?: string } = {}
  ): Promise<SegmentApprovalResult> {
    const sessionId = IngestionSessionRecordSchema.shape.sessionId.parse(sessionIdInput);
    const segmentId = IngestionSegmentRecordSchema.shape.segmentId.parse(segmentIdInput);
    const approvedAt = options.approvedAt ?? new Date().toISOString();
    const updatedAt = options.updatedAt ?? approvedAt;
    const snapshot = await this.loadSessionSnapshot(sessionId);
    const segmentSnapshot = snapshot.segments.find(({ segment }) => segment.segmentId === segmentId);

    if (!segmentSnapshot) {
      throw new Error(`Segment ${segmentId} does not exist for session ${sessionId}`);
    }

    const unresolvedCandidate = segmentSnapshot.candidates.find(
      (candidate) => candidate.normalizedPayload === null
    );
    if (unresolvedCandidate) {
      throw new Error(`Segment ${segmentId} still has candidates with null normalized payload.`);
    }

    await this.client.query(
      `
        UPDATE ingestion_segments
        SET workflow_state = $3,
            approved_at = $4
        WHERE session_id = $1 AND segment_id = $2
      `,
      [sessionId, segmentId, "approved", approvedAt]
    );

    const sessionWorkflowState = await this.recalculateSessionState(sessionId, { updatedAt });

    return SegmentApprovalResultSchema.parse({
      sessionId,
      segmentId,
      sessionWorkflowState,
      segmentWorkflowState: "approved",
      approvedAt
    });
  }

  async listApprovedSegments(sessionIdInput: string): Promise<IngestionSegmentSnapshot[]> {
    const sessionId = IngestionSessionRecordSchema.shape.sessionId.parse(sessionIdInput);
    const snapshot = await this.loadSessionSnapshot(sessionId);
    return snapshot.segments.filter(
      ({ segment }) => segment.workflowState === "approved" || segment.approvedAt
    );
  }

  async recalculateSessionState(
    sessionIdInput: string,
    options: { updatedAt?: string } = {}
  ): Promise<IngestionWorkflowState> {
    const sessionId = IngestionSessionRecordSchema.shape.sessionId.parse(sessionIdInput);
    const snapshot = await this.loadSessionSnapshot(sessionId);
    const workflowState = computeSessionWorkflowState(snapshot);
    const updatedAt = options.updatedAt ?? new Date().toISOString();

    await this.setSessionState(sessionId, workflowState, {
      updatedAt,
      lastCheckedAt: workflowState === "checked" ? snapshot.session.lastCheckedAt : undefined,
      lastVerdictRunId: workflowState === "checked" ? snapshot.session.lastVerdictRunId : undefined
    });

    return workflowState;
  }

  async setSessionState(
    sessionIdInput: string,
    workflowStateInput: IngestionWorkflowState,
    options: SessionStateUpdate = {}
  ): Promise<void> {
    const sessionId = IngestionSessionRecordSchema.shape.sessionId.parse(sessionIdInput);
    const workflowState = IngestionWorkflowStateSchema.parse(workflowStateInput);
    const updatedAt = options.updatedAt ?? new Date().toISOString();

    const result = await this.client.query(
      `
        UPDATE ingestion_sessions
        SET workflow_state = $2,
            updated_at = $3,
            last_checked_at = COALESCE($4, last_checked_at),
            last_verdict_run_id = COALESCE($5, last_verdict_run_id)
        WHERE session_id = $1
      `,
      [
        sessionId,
        workflowState,
        updatedAt,
        options.lastCheckedAt ?? null,
        options.lastVerdictRunId ?? null
      ]
    );

    if (!result.rowCount) {
      throw new Error(`Ingestion session not found: ${sessionId}`);
    }
  }
}
