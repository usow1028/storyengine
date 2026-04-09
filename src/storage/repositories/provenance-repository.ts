import { z } from "zod";

import { ProvenanceIdSchema } from "../../domain/index.js";
import { asJson, type SqlQueryable } from "../db.js";

export const ProvenanceRecordSchema = z.object({
  provenanceId: ProvenanceIdSchema,
  ownerType: z.enum([
    "story",
    "revision",
    "entity",
    "state_boundary",
    "event",
    "causal_link",
    "rule",
    "verdict"
  ]),
  ownerId: z.string().min(1),
  sourceKind: z.enum(["manual", "normalized", "imported", "test_fixture"]),
  sourceRef: z.string().min(1),
  detail: z.record(z.string(), z.unknown()).default({})
});
export type ProvenanceRecord = z.infer<typeof ProvenanceRecordSchema>;

export class ProvenanceRepository {
  constructor(private readonly client: SqlQueryable) {}

  async saveMany(records: ProvenanceRecord[]): Promise<void> {
    for (const recordInput of records) {
      const record = ProvenanceRecordSchema.parse(recordInput);
      await this.client.query(
        `
          INSERT INTO provenance_records (
            provenance_id,
            owner_type,
            owner_id,
            source_kind,
            source_ref,
            detail
          )
          VALUES ($1, $2, $3, $4, $5, CAST($6 AS jsonb))
          ON CONFLICT (provenance_id) DO UPDATE SET
            owner_type = EXCLUDED.owner_type,
            owner_id = EXCLUDED.owner_id,
            source_kind = EXCLUDED.source_kind,
            source_ref = EXCLUDED.source_ref,
            detail = EXCLUDED.detail
        `,
        [
          record.provenanceId,
          record.ownerType,
          record.ownerId,
          record.sourceKind,
          record.sourceRef,
          asJson(record.detail)
        ]
      );
    }
  }

  async listByOwner(ownerType: ProvenanceRecord["ownerType"], ownerId: string): Promise<ProvenanceRecord[]> {
    const rows = (
      await this.client.query<{
        provenanceId: string;
        ownerType: ProvenanceRecord["ownerType"];
        ownerId: string;
        sourceKind: ProvenanceRecord["sourceKind"];
        sourceRef: string;
        detail: Record<string, unknown>;
      }>(
        `
          SELECT
            provenance_id AS "provenanceId",
            owner_type AS "ownerType",
            owner_id AS "ownerId",
            source_kind AS "sourceKind",
            source_ref AS "sourceRef",
            detail
          FROM provenance_records
          WHERE owner_type = $1 AND owner_id = $2
          ORDER BY provenance_id
        `,
        [ownerType, ownerId]
      )
    ).rows;

    return rows.map((row) => ProvenanceRecordSchema.parse(row));
  }
}
