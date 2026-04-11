import {
  RunInspectionSnapshotSchema,
  VerdictRunRecordSchema,
  VerdictRunScopeSchema,
  type RunInspectionSnapshot,
  type VerdictRunRecord
} from "../../domain/index.js";
import { asJson, type SqlQueryable } from "../db.js";

type VerdictRunRow = {
  runId: string;
  storyId: string;
  revisionId: string;
  previousRunId?: string | null;
  triggerKind: "manual" | "rerun" | "test" | "system";
  createdAt: string;
  scopeId?: string | null;
  scopeKind?: "full_approved_draft" | "section" | "segment_range" | null;
  comparisonScopeKey?: string | null;
  scopePayload?: unknown | null;
};

function parseVerdictRunRow(row: VerdictRunRow): VerdictRunRecord {
  const scope =
    row.scopeId && row.scopeKind && row.comparisonScopeKey && row.scopePayload
      ? VerdictRunScopeSchema.parse({
          scopeId: row.scopeId,
          scopeKind: row.scopeKind,
          comparisonScopeKey: row.comparisonScopeKey,
          ...row.scopePayload
        })
      : undefined;

  return VerdictRunRecordSchema.parse({
    runId: row.runId,
    storyId: row.storyId,
    revisionId: row.revisionId,
    previousRunId: row.previousRunId ?? undefined,
    triggerKind: row.triggerKind,
    createdAt: row.createdAt,
    scope
  });
}

export class VerdictRunRepository {
  constructor(private readonly client: SqlQueryable) {}

  async saveRun(input: VerdictRunRecord): Promise<void> {
    const run = VerdictRunRecordSchema.parse(input);

    await this.client.query(
      `
        INSERT INTO verdict_runs (
          run_id,
          story_id,
          revision_id,
          previous_run_id,
          trigger_kind,
          created_at,
          scope_id,
          scope_kind,
          comparison_scope_key,
          scope_payload
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CAST($10 AS jsonb))
        ON CONFLICT (run_id) DO UPDATE SET
          story_id = EXCLUDED.story_id,
          revision_id = EXCLUDED.revision_id,
          previous_run_id = EXCLUDED.previous_run_id,
          trigger_kind = EXCLUDED.trigger_kind,
          created_at = EXCLUDED.created_at,
          scope_id = EXCLUDED.scope_id,
          scope_kind = EXCLUDED.scope_kind,
          comparison_scope_key = EXCLUDED.comparison_scope_key,
          scope_payload = EXCLUDED.scope_payload
      `,
      [
        run.runId,
        run.storyId,
        run.revisionId,
        run.previousRunId ?? null,
        run.triggerKind,
        run.createdAt,
        run.scope?.scopeId ?? null,
        run.scope?.scopeKind ?? null,
        run.scope?.comparisonScopeKey ?? null,
        run.scope
          ? asJson({
              segmentIds: run.scope.segmentIds,
              eventIds: run.scope.eventIds,
              sourceTextRefs: run.scope.sourceTextRefs,
              payload: run.scope.payload
            })
          : null
      ]
    );
  }

  async getRun(runId: string): Promise<VerdictRunRecord | undefined> {
    const row = (
      await this.client.query<VerdictRunRow>(
        `
          SELECT
            run_id AS "runId",
            story_id AS "storyId",
            revision_id AS "revisionId",
            previous_run_id AS "previousRunId",
            trigger_kind AS "triggerKind",
            created_at AS "createdAt",
            scope_id AS "scopeId",
            scope_kind AS "scopeKind",
            comparison_scope_key AS "comparisonScopeKey",
            scope_payload AS "scopePayload"
          FROM verdict_runs
          WHERE run_id = $1
        `,
        [runId]
      )
    ).rows[0];

    return row ? parseVerdictRunRow(row) : undefined;
  }

  async listRunsForRevision(storyId: string, revisionId: string): Promise<VerdictRunRecord[]> {
    const rows = (
      await this.client.query<VerdictRunRow>(
        `
          SELECT
            run_id AS "runId",
            story_id AS "storyId",
            revision_id AS "revisionId",
            previous_run_id AS "previousRunId",
            trigger_kind AS "triggerKind",
            created_at AS "createdAt",
            scope_id AS "scopeId",
            scope_kind AS "scopeKind",
            comparison_scope_key AS "comparisonScopeKey",
            scope_payload AS "scopePayload"
          FROM verdict_runs
          WHERE story_id = $1 AND revision_id = $2
          ORDER BY created_at, run_id
        `,
        [storyId, revisionId]
      )
    ).rows;

    return rows.map(parseVerdictRunRow);
  }

  async getLatestRunForRevision(
    storyId: string,
    revisionId: string
  ): Promise<VerdictRunRecord | undefined> {
    const runs = await this.listRunsForRevision(storyId, revisionId);
    return runs.length > 0 ? runs[runs.length - 1] : undefined;
  }

  async getLatestComparableRun(
    storyId: string,
    revisionId: string,
    comparisonScopeKey: string
  ): Promise<VerdictRunRecord | undefined> {
    const row = (
      await this.client.query<VerdictRunRow>(
        `
          SELECT
            run_id AS "runId",
            story_id AS "storyId",
            revision_id AS "revisionId",
            previous_run_id AS "previousRunId",
            trigger_kind AS "triggerKind",
            created_at AS "createdAt",
            scope_id AS "scopeId",
            scope_kind AS "scopeKind",
            comparison_scope_key AS "comparisonScopeKey",
            scope_payload AS "scopePayload"
          FROM verdict_runs
          WHERE story_id = $1
            AND revision_id = $2
            AND comparison_scope_key = $3
          ORDER BY created_at DESC, run_id DESC
          LIMIT 1
        `,
        [storyId, revisionId, comparisonScopeKey]
      )
    ).rows[0];

    return row ? parseVerdictRunRow(row) : undefined;
  }

  async saveInspectionSnapshot(
    runId: string,
    snapshotInput: RunInspectionSnapshot
  ): Promise<void> {
    const snapshot = RunInspectionSnapshotSchema.parse(snapshotInput);
    if (snapshot.runId !== runId) {
      throw new Error(`Inspection snapshot runId mismatch: ${snapshot.runId} !== ${runId}`);
    }

    const result = await this.client.query(
      `
        UPDATE verdict_runs
        SET inspection_snapshot = CAST($2 AS jsonb)
        WHERE run_id = $1
      `,
      [runId, asJson(snapshot)]
    );

    if (result.rowCount === 0) {
      throw new Error(`Verdict run not found: ${runId}`);
    }
  }

  async getInspectionSnapshot(runId: string): Promise<RunInspectionSnapshot | undefined> {
    const row = (
      await this.client.query<{
        inspectionSnapshot?: unknown | null;
      }>(
        `
          SELECT inspection_snapshot AS "inspectionSnapshot"
          FROM verdict_runs
          WHERE run_id = $1
        `,
        [runId]
      )
    ).rows[0];

    if (!row?.inspectionSnapshot) {
      return undefined;
    }

    return RunInspectionSnapshotSchema.parse(row.inspectionSnapshot);
  }
}
