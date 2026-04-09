import {
  NormalizedExecutableRuleSchema,
  RulePackMetadataSchema,
  type NormalizedExecutableRule,
  type RulePackMetadata
} from "../../domain/index.js";
import { asJson, withTransaction, type SqlQueryable } from "../db.js";

export class RuleRepository {
  constructor(private readonly client: SqlQueryable) {}

  async saveRulePack(
    metadataInput: RulePackMetadata,
    versionInput: NormalizedExecutableRule
  ): Promise<void> {
    const metadata = RulePackMetadataSchema.parse(metadataInput);
    const version = NormalizedExecutableRuleSchema.parse(versionInput);

    await withTransaction(this.client, async () => {
      await this.client.query(
        `
          INSERT INTO rule_packs (
            rule_pack_id,
            story_id,
            revision_id,
            name,
            description,
            world_affiliation,
            scope,
            scope_target_id,
            priority,
            active,
            source_kind,
            source_text,
            default_physics,
            provenance_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (rule_pack_id) DO UPDATE SET
            story_id = EXCLUDED.story_id,
            revision_id = EXCLUDED.revision_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            world_affiliation = EXCLUDED.world_affiliation,
            scope = EXCLUDED.scope,
            scope_target_id = EXCLUDED.scope_target_id,
            priority = EXCLUDED.priority,
            active = EXCLUDED.active,
            source_kind = EXCLUDED.source_kind,
            source_text = EXCLUDED.source_text,
            default_physics = EXCLUDED.default_physics,
            provenance_id = EXCLUDED.provenance_id
        `,
        [
          metadata.rulePackId,
          metadata.storyId,
          metadata.revisionId,
          metadata.name,
          metadata.description,
          metadata.worldAffiliation,
          metadata.scope,
          metadata.scopeTargetId ?? null,
          metadata.priority,
          metadata.active,
          metadata.sourceKind,
          metadata.sourceText,
          metadata.defaultPhysics,
          metadata.provenanceId ?? null
        ]
      );

      await this.client.query(
        `
          INSERT INTO rule_versions (
            rule_version_id,
            rule_pack_id,
            executable_kind,
            executable_ref,
            normalized_text,
            conditions,
            effects,
            validation_status,
            provenance_id
          )
          VALUES ($1, $2, $3, $4, $5, CAST($6 AS jsonb), CAST($7 AS jsonb), $8, $9)
          ON CONFLICT (rule_version_id) DO UPDATE SET
            rule_pack_id = EXCLUDED.rule_pack_id,
            executable_kind = EXCLUDED.executable_kind,
            executable_ref = EXCLUDED.executable_ref,
            normalized_text = EXCLUDED.normalized_text,
            conditions = EXCLUDED.conditions,
            effects = EXCLUDED.effects,
            validation_status = EXCLUDED.validation_status,
            provenance_id = EXCLUDED.provenance_id
        `,
        [
          version.ruleVersionId,
          version.rulePackId,
          version.executableKind,
          version.executableRef,
          version.normalizedText,
          asJson(version.conditions),
          asJson(version.effects),
          version.validationStatus,
          version.provenanceId ?? null
        ]
      );
    });
  }

  async loadRuleVersion(ruleVersionId: string): Promise<{
    metadata: RulePackMetadata;
    version: NormalizedExecutableRule;
  }> {
    const row = (
      await this.client.query<{
        rulePackId: string;
        storyId: string;
        revisionId: string;
        name: string;
        description: string;
        worldAffiliation: string;
        scope: string;
        scopeTargetId?: string | null;
        priority: number;
        active: boolean;
        sourceKind: "baseline" | "user_authored" | "imported" | "normalized";
        sourceText: string;
        defaultPhysics: boolean;
        metadataProvenanceId?: string | null;
        ruleVersionId: string;
        executableKind: "asp" | "dsl" | "sql" | "predicate" | "unknown";
        executableRef: string;
        normalizedText: string;
        conditions: string[];
        effects: string[];
        validationStatus: "draft" | "validated" | "rejected";
        versionProvenanceId?: string | null;
      }>(
        `
          SELECT
            p.rule_pack_id AS "rulePackId",
            p.story_id AS "storyId",
            p.revision_id AS "revisionId",
            p.name,
            p.description,
            p.world_affiliation AS "worldAffiliation",
            p.scope,
            p.scope_target_id AS "scopeTargetId",
            p.priority,
            p.active,
            p.source_kind AS "sourceKind",
            p.source_text AS "sourceText",
            p.default_physics AS "defaultPhysics",
            p.provenance_id AS "metadataProvenanceId",
            v.rule_version_id AS "ruleVersionId",
            v.executable_kind AS "executableKind",
            v.executable_ref AS "executableRef",
            v.normalized_text AS "normalizedText",
            v.conditions,
            v.effects,
            v.validation_status AS "validationStatus",
            v.provenance_id AS "versionProvenanceId"
          FROM rule_versions v
          JOIN rule_packs p ON p.rule_pack_id = v.rule_pack_id
          WHERE v.rule_version_id = $1
        `,
        [ruleVersionId]
      )
    ).rows[0];

    if (!row) {
      throw new Error(`Rule version not found: ${ruleVersionId}`);
    }

    return {
      metadata: RulePackMetadataSchema.parse({
        rulePackId: row.rulePackId,
        storyId: row.storyId,
        revisionId: row.revisionId,
        name: row.name,
        description: row.description,
        worldAffiliation: row.worldAffiliation,
        scope: row.scope,
        scopeTargetId: row.scopeTargetId ?? undefined,
        priority: row.priority,
        active: row.active,
        sourceKind: row.sourceKind,
        sourceText: row.sourceText,
        defaultPhysics: row.defaultPhysics,
        provenanceId: row.metadataProvenanceId ?? undefined
      }),
      version: NormalizedExecutableRuleSchema.parse({
        ruleVersionId: row.ruleVersionId,
        rulePackId: row.rulePackId,
        executableKind: row.executableKind,
        executableRef: row.executableRef,
        normalizedText: row.normalizedText,
        conditions: row.conditions ?? [],
        effects: row.effects ?? [],
        validationStatus: row.validationStatus,
        provenanceId: row.versionProvenanceId ?? undefined
      })
    };
  }

  async listRuleVersionsForRevision(
    storyId: string,
    revisionId: string
  ): Promise<
    Array<{
      metadata: RulePackMetadata;
      version: NormalizedExecutableRule;
    }>
  > {
    const rows = (
      await this.client.query<{
        rulePackId: string;
        storyId: string;
        revisionId: string;
        name: string;
        description: string;
        worldAffiliation: string;
        scope: string;
        scopeTargetId?: string | null;
        priority: number;
        active: boolean;
        sourceKind: "baseline" | "user_authored" | "imported" | "normalized";
        sourceText: string;
        defaultPhysics: boolean;
        metadataProvenanceId?: string | null;
        ruleVersionId: string;
        executableKind: "asp" | "dsl" | "sql" | "predicate" | "unknown";
        executableRef: string;
        normalizedText: string;
        conditions: string[];
        effects: string[];
        validationStatus: "draft" | "validated" | "rejected";
        versionProvenanceId?: string | null;
      }>(
        `
          SELECT
            p.rule_pack_id AS "rulePackId",
            p.story_id AS "storyId",
            p.revision_id AS "revisionId",
            p.name,
            p.description,
            p.world_affiliation AS "worldAffiliation",
            p.scope,
            p.scope_target_id AS "scopeTargetId",
            p.priority,
            p.active,
            p.source_kind AS "sourceKind",
            p.source_text AS "sourceText",
            p.default_physics AS "defaultPhysics",
            p.provenance_id AS "metadataProvenanceId",
            v.rule_version_id AS "ruleVersionId",
            v.executable_kind AS "executableKind",
            v.executable_ref AS "executableRef",
            v.normalized_text AS "normalizedText",
            v.conditions,
            v.effects,
            v.validation_status AS "validationStatus",
            v.provenance_id AS "versionProvenanceId"
          FROM rule_versions v
          JOIN rule_packs p ON p.rule_pack_id = v.rule_pack_id
          WHERE p.story_id = $1 AND p.revision_id = $2
          ORDER BY
            CASE p.scope
              WHEN 'event' THEN 5
              WHEN 'character' THEN 4
              WHEN 'location' THEN 3
              WHEN 'story' THEN 2
              ELSE 1
            END DESC,
            p.priority DESC,
            v.rule_version_id
        `,
        [storyId, revisionId]
      )
    ).rows;

    return rows.map((row) => ({
      metadata: RulePackMetadataSchema.parse({
        rulePackId: row.rulePackId,
        storyId: row.storyId,
        revisionId: row.revisionId,
        name: row.name,
        description: row.description,
        worldAffiliation: row.worldAffiliation,
        scope: row.scope,
        scopeTargetId: row.scopeTargetId ?? undefined,
        priority: row.priority,
        active: row.active,
        sourceKind: row.sourceKind,
        sourceText: row.sourceText,
        defaultPhysics: row.defaultPhysics,
        provenanceId: row.metadataProvenanceId ?? undefined
      }),
      version: NormalizedExecutableRuleSchema.parse({
        ruleVersionId: row.ruleVersionId,
        rulePackId: row.rulePackId,
        executableKind: row.executableKind,
        executableRef: row.executableRef,
        normalizedText: row.normalizedText,
        conditions: row.conditions ?? [],
        effects: row.effects ?? [],
        validationStatus: row.validationStatus,
        provenanceId: row.versionProvenanceId ?? undefined
      })
    }));
  }
}
