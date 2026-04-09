import { VerdictRecordSchema, type VerdictRecord } from "../../domain/index.js";
import { asJson, type SqlQueryable } from "../db.js";

export class VerdictRepository {
  constructor(private readonly client: SqlQueryable) {}

  async saveVerdict(input: VerdictRecord): Promise<void> {
    const verdict = VerdictRecordSchema.parse(input);

    await this.client.query(
      `
        INSERT INTO verdicts (
          verdict_id,
          story_id,
          revision_id,
          verdict_kind,
          category,
          explanation,
          evidence,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, CAST($7 AS jsonb), $8)
        ON CONFLICT (verdict_id) DO UPDATE SET
          story_id = EXCLUDED.story_id,
          revision_id = EXCLUDED.revision_id,
          verdict_kind = EXCLUDED.verdict_kind,
          category = EXCLUDED.category,
          explanation = EXCLUDED.explanation,
          evidence = EXCLUDED.evidence,
          created_at = EXCLUDED.created_at
      `,
      [
        verdict.verdictId,
        verdict.storyId,
        verdict.revisionId,
        verdict.verdictKind,
        verdict.category,
        verdict.explanation,
        asJson(verdict.evidence),
        verdict.createdAt
      ]
    );
  }

  async listForRevision(storyId: string, revisionId: string): Promise<VerdictRecord[]> {
    const rows = (
      await this.client.query<{
        verdictId: string;
        storyId: string;
        revisionId: string;
        verdictKind: "Hard Contradiction" | "Repairable Gap" | "Soft Drift" | "Consistent";
        category:
          | "physical_impossibility"
          | "temporal_contradiction"
          | "causal_gap"
          | "character_state_contradiction"
          | "rule_conflict"
          | "provenance_gap";
        explanation: string;
        evidence: Record<string, unknown>;
        createdAt: string;
      }>(
        `
          SELECT
            verdict_id AS "verdictId",
            story_id AS "storyId",
            revision_id AS "revisionId",
            verdict_kind AS "verdictKind",
            category,
            explanation,
            evidence,
            created_at AS "createdAt"
          FROM verdicts
          WHERE story_id = $1 AND revision_id = $2
          ORDER BY created_at, verdict_id
        `,
        [storyId, revisionId]
      )
    ).rows;

    return rows.map((row) => VerdictRecordSchema.parse(row));
  }
}
