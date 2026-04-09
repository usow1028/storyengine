import {
  CanonicalEntitySchema,
  CanonicalEventSchema,
  CausalLinkSchema,
  CharacterStateBoundarySchema,
  IngestionCandidateRecordSchema,
  IngestionSessionRecordSchema,
  IngestionSessionSnapshotSchema,
  IngestionSegmentRecordSchema,
  IngestionWorkflowStateSchema,
  ReviewSegmentPatchSchema,
  RuleCandidateNormalizedPayloadSchema,
  SegmentApprovalResultSchema,
  StructuredExtractionBatchSchema,
  type IngestionCandidateRecord,
  type IngestionSessionRecord,
  type IngestionSegmentSnapshot,
  type IngestionSessionSnapshot,
  type IngestionWorkflowState,
  type ReviewSegmentPatch,
  type SegmentApprovalResult,
  type StructuredExtractionBatch
} from "../../domain/index.js";
import { asJson, withTransaction, type SqlQueryable } from "../db.js";

type SessionRow = {
  sessionId: string;
  storyId: string | null;
  revisionId: string | null;
  draftTitle: string;
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
  workflowState: string;
  approvedAt: string | null;
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

function parseCandidateRow(row: CandidateRow): IngestionCandidateRecord {
  return IngestionCandidateRecordSchema.parse(row);
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

  if (approvedSegments.length === snapshot.segments.length && snapshot.segments.length > 0) {
    if (snapshot.session.workflowState === "checked" && snapshot.session.lastCheckedAt) {
      return "checked";
    }

    return "approved";
  }

  if (approvedSegments.length > 0) {
    return "partially_approved";
  }

  if (snapshot.segments.some(({ segment }) => segment.workflowState === "needs_review")) {
    return "needs_review";
  }

  if (snapshot.segments.some(({ segment }) => segment.workflowState === "extracted")) {
    return "extracted";
  }

  return "submitted";
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

  async createSession(input: IngestionSessionRecord): Promise<IngestionSessionRecord> {
    const session = IngestionSessionRecordSchema.parse(input);

    await this.client.query(
      `
        INSERT INTO ingestion_sessions (
          session_id,
          story_id,
          revision_id,
          draft_title,
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (session_id) DO UPDATE SET
          story_id = EXCLUDED.story_id,
          revision_id = EXCLUDED.revision_id,
          draft_title = EXCLUDED.draft_title,
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
              workflow_state,
              approved_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (segment_id) DO UPDATE SET
              session_id = EXCLUDED.session_id,
              sequence = EXCLUDED.sequence,
              label = EXCLUDED.label,
              start_offset = EXCLUDED.start_offset,
              end_offset = EXCLUDED.end_offset,
              segment_text = EXCLUDED.segment_text,
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
        const updated = await this.client.query(
          `
            UPDATE ingestion_segments
            SET workflow_state = $2
            WHERE session_id = $1 AND segment_id = $3
          `,
          [batch.sessionId, segment.workflowState, segment.segmentId]
        );

        if (!updated.rowCount) {
          throw new Error(`Segment ${segment.segmentId} does not exist for session ${batch.sessionId}`);
        }

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
            workflow_state AS "workflowState",
            approved_at AS "approvedAt"
          FROM ingestion_segments
          WHERE session_id = $1
          ORDER BY sequence, segment_id
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

    const candidatesBySegment = new Map<string, IngestionCandidateRecord[]>();
    for (const row of candidateRows) {
      const parsed = parseCandidateRow(row);
      const existing = candidatesBySegment.get(parsed.segmentId) ?? [];
      existing.push(parsed);
      candidatesBySegment.set(parsed.segmentId, existing);
    }

    return IngestionSessionSnapshotSchema.parse({
      session: parseSessionRow(sessionRow),
      segments: segmentRows.map((row) => {
        const segment = parseSegmentRow(row);
        return {
          segment,
          candidates: candidatesBySegment.get(segment.segmentId) ?? []
        };
      })
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
              workflow_state = $6
          WHERE session_id = $1 AND segment_id = $2
        `,
        [
          sessionId,
          segmentId,
          nextLabel,
          nextStartOffset,
          nextEndOffset,
          segmentSnapshot.segment.approvedAt ? "approved" : "needs_review"
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
