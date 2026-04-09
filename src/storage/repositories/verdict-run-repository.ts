import { VerdictRunRecordSchema, type VerdictRunRecord } from "../../domain/index.js";
import type { SqlQueryable } from "../db.js";

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
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (run_id) DO UPDATE SET
          story_id = EXCLUDED.story_id,
          revision_id = EXCLUDED.revision_id,
          previous_run_id = EXCLUDED.previous_run_id,
          trigger_kind = EXCLUDED.trigger_kind,
          created_at = EXCLUDED.created_at
      `,
      [
        run.runId,
        run.storyId,
        run.revisionId,
        run.previousRunId ?? null,
        run.triggerKind,
        run.createdAt
      ]
    );
  }

  async getRun(runId: string): Promise<VerdictRunRecord | undefined> {
    const row = (
      await this.client.query<{
        runId: string;
        storyId: string;
        revisionId: string;
        previousRunId?: string | null;
        triggerKind: "manual" | "rerun" | "test" | "system";
        createdAt: string;
      }>(
        `
          SELECT
            run_id AS "runId",
            story_id AS "storyId",
            revision_id AS "revisionId",
            previous_run_id AS "previousRunId",
            trigger_kind AS "triggerKind",
            created_at AS "createdAt"
          FROM verdict_runs
          WHERE run_id = $1
        `,
        [runId]
      )
    ).rows[0];

    return row ? VerdictRunRecordSchema.parse({ ...row, previousRunId: row.previousRunId ?? undefined }) : undefined;
  }

  async listRunsForRevision(storyId: string, revisionId: string): Promise<VerdictRunRecord[]> {
    const rows = (
      await this.client.query<{
        runId: string;
        storyId: string;
        revisionId: string;
        previousRunId?: string | null;
        triggerKind: "manual" | "rerun" | "test" | "system";
        createdAt: string;
      }>(
        `
          SELECT
            run_id AS "runId",
            story_id AS "storyId",
            revision_id AS "revisionId",
            previous_run_id AS "previousRunId",
            trigger_kind AS "triggerKind",
            created_at AS "createdAt"
          FROM verdict_runs
          WHERE story_id = $1 AND revision_id = $2
          ORDER BY created_at, run_id
        `,
        [storyId, revisionId]
      )
    ).rows;

    return rows.map((row) =>
      VerdictRunRecordSchema.parse({
        ...row,
        previousRunId: row.previousRunId ?? undefined
      })
    );
  }

  async getLatestRunForRevision(
    storyId: string,
    revisionId: string
  ): Promise<VerdictRunRecord | undefined> {
    const runs = await this.listRunsForRevision(storyId, revisionId);
    return runs.length > 0 ? runs[runs.length - 1] : undefined;
  }
}
