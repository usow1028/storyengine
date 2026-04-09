import {
  CanonicalEntitySchema,
  CanonicalEventSchema,
  CausalLinkSchema,
  CharacterStateBoundarySchema,
  EntityKindSchema,
  StoryRecordSchema,
  StoryRevisionRecordSchema,
  type CanonicalEntity,
  type CanonicalEvent,
  type CausalLink,
  type CharacterStateBoundary,
  type StoryRecord,
  type StoryRevisionRecord
} from "../../domain/index.js";
import { asJson, withTransaction, type SqlQueryable } from "../db.js";

type EntityRow = {
  entityId: string;
  storyId: string;
  revisionId: string;
  entityKind: string;
  name: string;
  aliases: string[];
  description: string;
  metadata: Record<string, unknown>;
};

type StateBoundaryRow = {
  boundaryId: string;
  storyId: string;
  revisionId: string;
  characterId: string;
  sequence: number;
  boundaryKind: string;
  anchorEventId?: string | null;
  locationId?: string | null;
  aliveStatus: string;
  knowledge: string[];
  goals: string[];
  loyalties: string[];
  resources: string[];
  conditions: string[];
  provenanceId?: string | null;
};

type StateExtensionRow = {
  boundaryId: string;
  key: string;
  valueType: string;
  value: unknown;
  provenanceId?: string | null;
};

type EventRow = {
  eventId: string;
  storyId: string;
  revisionId: string;
  eventType: string;
  abstract: boolean;
  actorIds: string[];
  targetIds: string[];
  sequence: number;
  timeRelation: string;
  anchorEventId?: string | null;
  absoluteTimestamp?: string | null;
  durationMinutes?: number | null;
  minTravelMinutes?: number | null;
  placeId?: string | null;
  causalLinkIds: string[];
  provenanceId?: string | null;
};

type EventPreconditionRow = {
  eventId: string;
  preconditionIndex: number;
  description: string;
  actorId?: string | null;
  requiredRuleVersionId?: string | null;
};

type EventEffectRow = {
  effectId: string;
  eventId: string;
  effectIndex: number;
  description: string;
  provenanceId?: string | null;
};

type EventStateChangeRow = {
  effectId: string;
  changeIndex: number;
  subjectId: string;
  field: string;
  operation: string;
  value: unknown;
  provenanceId?: string | null;
};

type EventRuleChangeRow = {
  effectId: string;
  changeIndex: number;
  ruleVersionId: string;
  operation: string;
  provenanceId?: string | null;
};

export interface CanonicalStoryGraph {
  story: StoryRecord;
  revision: StoryRevisionRecord;
  entities: CanonicalEntity[];
  stateBoundaries: CharacterStateBoundary[];
  events: CanonicalEvent[];
  causalLinks: CausalLink[];
}

export class StoryRepository {
  constructor(private readonly client: SqlQueryable) {}

  async saveGraph(input: CanonicalStoryGraph): Promise<void> {
    const graph: CanonicalStoryGraph = {
      story: StoryRecordSchema.parse(input.story),
      revision: StoryRevisionRecordSchema.parse(input.revision),
      entities: input.entities.map((entity) => CanonicalEntitySchema.parse(entity)),
      stateBoundaries: input.stateBoundaries.map((boundary) =>
        CharacterStateBoundarySchema.parse(boundary)
      ),
      events: input.events.map((event) => CanonicalEventSchema.parse(event)),
      causalLinks: input.causalLinks.map((link) => CausalLinkSchema.parse(link))
    };

    await withTransaction(this.client, async () => {
      await this.client.query(
        `
          INSERT INTO stories (story_id, title, description, default_rule_pack_name)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (story_id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            default_rule_pack_name = EXCLUDED.default_rule_pack_name
        `,
        [
          graph.story.storyId,
          graph.story.title,
          graph.story.description,
          graph.story.defaultRulePackName
        ]
      );

      await this.client.query(
        `
          INSERT INTO story_revisions (revision_id, story_id, based_on_revision_id, source_kind, created_at)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (revision_id) DO UPDATE SET
            story_id = EXCLUDED.story_id,
            based_on_revision_id = EXCLUDED.based_on_revision_id,
            source_kind = EXCLUDED.source_kind,
            created_at = EXCLUDED.created_at
        `,
        [
          graph.revision.revisionId,
          graph.revision.storyId,
          graph.revision.basedOnRevisionId ?? null,
          graph.revision.sourceKind,
          graph.revision.createdAt
        ]
      );

      for (const entity of graph.entities) {
        const metadata =
          entity.entityKind === "character"
            ? {
                archetypes: entity.archetypes,
                defaultLoyalties: entity.defaultLoyalties
              }
            : entity.entityKind === "place"
              ? {
                  coordinates: entity.coordinates ?? null,
                  movementClass: entity.movementClass
                }
              : entity.entityKind === "object"
                ? {
                    ownerId: entity.ownerId ?? null,
                    portable: entity.portable
                  }
                : {
                    scope: entity.scope
                  };

        await this.client.query(
          `
            INSERT INTO entities (
              entity_id,
              story_id,
              revision_id,
              entity_kind,
              name,
              aliases,
              description,
              metadata
            )
            VALUES ($1, $2, $3, $4, $5, CAST($6 AS jsonb), $7, CAST($8 AS jsonb))
            ON CONFLICT (entity_id) DO UPDATE SET
              story_id = EXCLUDED.story_id,
              revision_id = EXCLUDED.revision_id,
              entity_kind = EXCLUDED.entity_kind,
              name = EXCLUDED.name,
              aliases = EXCLUDED.aliases,
              description = EXCLUDED.description,
              metadata = EXCLUDED.metadata
          `,
          [
            entity.entityId,
            entity.storyId,
            entity.revisionId,
            entity.entityKind,
            entity.name,
            asJson(entity.aliases),
            entity.description,
            asJson(metadata)
          ]
        );

        if (entity.entityKind === "place") {
          await this.client.query(
            `
              INSERT INTO place_hierarchy (place_id, parent_place_id)
              VALUES ($1, $2)
              ON CONFLICT (place_id) DO UPDATE SET
                parent_place_id = EXCLUDED.parent_place_id
            `,
            [entity.entityId, entity.parentPlaceId ?? null]
          );
        }
      }

      for (const boundary of graph.stateBoundaries) {
        await this.client.query(
          `
            INSERT INTO character_state_boundaries (
              boundary_id,
              story_id,
              revision_id,
              character_id,
              sequence,
              boundary_kind,
              anchor_event_id,
              location_id,
              alive_status,
              knowledge,
              goals,
              loyalties,
              resources,
              conditions,
              provenance_id
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9,
              CAST($10 AS jsonb),
              CAST($11 AS jsonb),
              CAST($12 AS jsonb),
              CAST($13 AS jsonb),
              CAST($14 AS jsonb),
              $15
            )
            ON CONFLICT (boundary_id) DO UPDATE SET
              story_id = EXCLUDED.story_id,
              revision_id = EXCLUDED.revision_id,
              character_id = EXCLUDED.character_id,
              sequence = EXCLUDED.sequence,
              boundary_kind = EXCLUDED.boundary_kind,
              anchor_event_id = EXCLUDED.anchor_event_id,
              location_id = EXCLUDED.location_id,
              alive_status = EXCLUDED.alive_status,
              knowledge = EXCLUDED.knowledge,
              goals = EXCLUDED.goals,
              loyalties = EXCLUDED.loyalties,
              resources = EXCLUDED.resources,
              conditions = EXCLUDED.conditions,
              provenance_id = EXCLUDED.provenance_id
          `,
          [
            boundary.boundaryId,
            boundary.storyId,
            boundary.revisionId,
            boundary.characterId,
            boundary.sequence,
            boundary.boundaryKind,
            boundary.anchorEventId ?? null,
            boundary.core.locationId ?? null,
            boundary.core.aliveStatus,
            asJson(boundary.core.knowledge),
            asJson(boundary.core.goals),
            asJson(boundary.core.loyalties),
            asJson(boundary.core.resources),
            asJson(boundary.core.conditions),
            boundary.provenanceId ?? null
          ]
        );

        for (const extension of boundary.extensions) {
          await this.client.query(
            `
              INSERT INTO state_extensions (
                boundary_id,
                extension_key,
                value_type,
                value,
                provenance_id
              )
              VALUES ($1, $2, $3, CAST($4 AS jsonb), $5)
              ON CONFLICT (boundary_id, extension_key) DO UPDATE SET
                value_type = EXCLUDED.value_type,
                value = EXCLUDED.value,
                provenance_id = EXCLUDED.provenance_id
            `,
            [
              boundary.boundaryId,
              extension.key,
              extension.valueType,
              asJson(extension.value),
              extension.provenanceId ?? null
            ]
          );
        }
      }

      for (const event of graph.events) {
        await this.client.query(
          `
            INSERT INTO events (
              event_id,
              story_id,
              revision_id,
              event_type,
              is_abstract,
              actor_ids,
              target_ids,
              sequence,
              time_relation,
              anchor_event_id,
              absolute_timestamp,
              duration_minutes,
              min_travel_minutes,
              place_id,
              causal_link_ids,
              provenance_id
            )
            VALUES (
              $1, $2, $3, $4, $5,
              CAST($6 AS jsonb),
              CAST($7 AS jsonb),
              $8, $9, $10, $11, $12, $13, $14,
              CAST($15 AS jsonb),
              $16
            )
            ON CONFLICT (event_id) DO UPDATE SET
              story_id = EXCLUDED.story_id,
              revision_id = EXCLUDED.revision_id,
              event_type = EXCLUDED.event_type,
              is_abstract = EXCLUDED.is_abstract,
              actor_ids = EXCLUDED.actor_ids,
              target_ids = EXCLUDED.target_ids,
              sequence = EXCLUDED.sequence,
              time_relation = EXCLUDED.time_relation,
              anchor_event_id = EXCLUDED.anchor_event_id,
              absolute_timestamp = EXCLUDED.absolute_timestamp,
              duration_minutes = EXCLUDED.duration_minutes,
              min_travel_minutes = EXCLUDED.min_travel_minutes,
              place_id = EXCLUDED.place_id,
              causal_link_ids = EXCLUDED.causal_link_ids,
              provenance_id = EXCLUDED.provenance_id
          `,
          [
            event.eventId,
            event.storyId,
            event.revisionId,
            event.eventType,
            event.abstract,
            asJson(event.actorIds),
            asJson(event.targetIds),
            event.sequence,
            event.time.relation,
            event.time.anchorEventId ?? null,
            event.time.absoluteTimestamp ?? null,
            event.time.durationMinutes ?? null,
            event.time.minTravelMinutes ?? null,
            event.placeId ?? null,
            asJson(event.causalLinkIds),
            event.provenanceId ?? null
          ]
        );

        for (const [preconditionIndex, precondition] of event.preconditions.entries()) {
          await this.client.query(
            `
              INSERT INTO event_preconditions (
                event_id,
                precondition_index,
                description,
                actor_id,
                required_rule_version_id
              )
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (event_id, precondition_index) DO UPDATE SET
                description = EXCLUDED.description,
                actor_id = EXCLUDED.actor_id,
                required_rule_version_id = EXCLUDED.required_rule_version_id
            `,
            [
              event.eventId,
              preconditionIndex,
              precondition.description,
              precondition.actorId ?? null,
              precondition.requiredRuleVersionId ?? null
            ]
          );
        }

        for (const [effectIndex, effect] of event.effects.entries()) {
          await this.client.query(
            `
              INSERT INTO event_effects (
                effect_id,
                event_id,
                effect_index,
                description,
                provenance_id
              )
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (effect_id) DO UPDATE SET
                event_id = EXCLUDED.event_id,
                effect_index = EXCLUDED.effect_index,
                description = EXCLUDED.description,
                provenance_id = EXCLUDED.provenance_id
            `,
            [
              effect.effectId,
              event.eventId,
              effectIndex,
              effect.description,
              effect.provenanceId ?? null
            ]
          );

          for (const [changeIndex, change] of effect.stateChanges.entries()) {
            await this.client.query(
              `
                INSERT INTO event_state_changes (
                  effect_id,
                  change_index,
                  subject_id,
                  field,
                  operation,
                  value,
                  provenance_id
                )
                VALUES ($1, $2, $3, $4, $5, CAST($6 AS jsonb), $7)
                ON CONFLICT (effect_id, change_index) DO UPDATE SET
                  subject_id = EXCLUDED.subject_id,
                  field = EXCLUDED.field,
                  operation = EXCLUDED.operation,
                  value = EXCLUDED.value,
                  provenance_id = EXCLUDED.provenance_id
              `,
              [
                effect.effectId,
                changeIndex,
                change.subjectId,
                change.field,
                change.operation,
                asJson(change.value),
                change.provenanceId ?? null
              ]
            );
          }

          for (const [changeIndex, change] of effect.ruleChanges.entries()) {
            await this.client.query(
              `
                INSERT INTO event_rule_changes (
                  effect_id,
                  change_index,
                  rule_version_id,
                  operation,
                  provenance_id
                )
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (effect_id, change_index) DO UPDATE SET
                  rule_version_id = EXCLUDED.rule_version_id,
                  operation = EXCLUDED.operation,
                  provenance_id = EXCLUDED.provenance_id
              `,
              [
                effect.effectId,
                changeIndex,
                change.ruleVersionId,
                change.operation,
                change.provenanceId ?? null
              ]
            );
          }
        }
      }

      for (const link of graph.causalLinks) {
        await this.client.query(
          `
            INSERT INTO causal_links (
              link_id,
              story_id,
              revision_id,
              cause_event_id,
              effect_event_id,
              relation
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (link_id) DO UPDATE SET
              story_id = EXCLUDED.story_id,
              revision_id = EXCLUDED.revision_id,
              cause_event_id = EXCLUDED.cause_event_id,
              effect_event_id = EXCLUDED.effect_event_id,
              relation = EXCLUDED.relation
          `,
          [
            link.linkId,
            link.storyId,
            link.revisionId,
            link.causeEventId,
            link.effectEventId,
            link.relation
          ]
        );
      }
    });
  }

  async loadGraph(storyId: string, revisionId: string): Promise<CanonicalStoryGraph> {
    const storyRow = (
      await this.client.query<{
        storyId: string;
        title: string;
        description: string;
        defaultRulePackName: string;
      }>(
        `
          SELECT
            story_id AS "storyId",
            title,
            description,
            default_rule_pack_name AS "defaultRulePackName"
          FROM stories
          WHERE story_id = $1
        `,
        [storyId]
      )
    ).rows[0];

    const revisionRow = (
      await this.client.query<{
        revisionId: string;
        storyId: string;
        basedOnRevisionId?: string | null;
        sourceKind: "manual" | "imported" | "normalized";
        createdAt: string;
      }>(
        `
          SELECT
            revision_id AS "revisionId",
            story_id AS "storyId",
            based_on_revision_id AS "basedOnRevisionId",
            source_kind AS "sourceKind",
            created_at AS "createdAt"
          FROM story_revisions
          WHERE story_id = $1 AND revision_id = $2
        `,
        [storyId, revisionId]
      )
    ).rows[0];

    if (!storyRow || !revisionRow) {
      throw new Error(`Story graph not found for story=${storyId} revision=${revisionId}`);
    }

    const entityRows = (
      await this.client.query<EntityRow>(
        `
          SELECT
            e.entity_id AS "entityId",
            e.story_id AS "storyId",
            e.revision_id AS "revisionId",
            e.entity_kind AS "entityKind",
            e.name,
            e.aliases,
            e.description,
            e.metadata
          FROM entities e
          WHERE e.story_id = $1 AND e.revision_id = $2
          ORDER BY e.entity_id
        `,
        [storyId, revisionId]
      )
    ).rows;

    const placeHierarchyRows = (
      await this.client.query<{ placeId: string; parentPlaceId?: string | null }>(
        `
          SELECT
            place_id AS "placeId",
            parent_place_id AS "parentPlaceId"
          FROM place_hierarchy
        `
      )
    ).rows;

    const parentByPlaceId = new Map(
      placeHierarchyRows.map((row) => [row.placeId, row.parentPlaceId ?? undefined])
    );

    const entities = entityRows.map((row) => {
      const kind = EntityKindSchema.parse(row.entityKind);
      if (kind === "character") {
        return CanonicalEntitySchema.parse({
          ...row,
          entityKind: kind,
          archetypes: (row.metadata.archetypes as string[] | undefined) ?? [],
          defaultLoyalties: (row.metadata.defaultLoyalties as string[] | undefined) ?? []
        });
      }
      if (kind === "place") {
        return CanonicalEntitySchema.parse({
          ...row,
          entityKind: kind,
          parentPlaceId: parentByPlaceId.get(row.entityId),
          coordinates: (row.metadata.coordinates as Record<string, number> | null) ?? undefined,
          movementClass: row.metadata.movementClass ?? "normal"
        });
      }
      if (kind === "object") {
        return CanonicalEntitySchema.parse({
          ...row,
          entityKind: kind,
          ownerId: row.metadata.ownerId ?? undefined,
          portable: row.metadata.portable ?? true
        });
      }

      return CanonicalEntitySchema.parse({
        ...row,
        entityKind: kind,
        scope: row.metadata.scope ?? "setting"
      });
    });

    const boundaryRows = (
      await this.client.query<StateBoundaryRow>(
        `
          SELECT
            boundary_id AS "boundaryId",
            story_id AS "storyId",
            revision_id AS "revisionId",
            character_id AS "characterId",
            sequence,
            boundary_kind AS "boundaryKind",
            anchor_event_id AS "anchorEventId",
            location_id AS "locationId",
            alive_status AS "aliveStatus",
            knowledge,
            goals,
            loyalties,
            resources,
            conditions,
            provenance_id AS "provenanceId"
          FROM character_state_boundaries
          WHERE story_id = $1 AND revision_id = $2
          ORDER BY sequence, boundary_id
        `,
        [storyId, revisionId]
      )
    ).rows;

    const extensionRows = (
      await this.client.query<StateExtensionRow>(
        `
          SELECT
            boundary_id AS "boundaryId",
            extension_key AS "key",
            value_type AS "valueType",
            value,
            provenance_id AS "provenanceId"
          FROM state_extensions
          WHERE boundary_id IN (
            SELECT boundary_id
            FROM character_state_boundaries
            WHERE story_id = $1 AND revision_id = $2
          )
          ORDER BY boundary_id, extension_key
        `,
        [storyId, revisionId]
      )
    ).rows;

    const extensionsByBoundary = new Map<string, StateExtensionRow[]>();
    for (const row of extensionRows) {
      const existing = extensionsByBoundary.get(row.boundaryId) ?? [];
      existing.push(row);
      extensionsByBoundary.set(row.boundaryId, existing);
    }

    const stateBoundaries = boundaryRows.map((row) =>
      CharacterStateBoundarySchema.parse({
        ...row,
        anchorEventId: row.anchorEventId ?? undefined,
        provenanceId: row.provenanceId ?? undefined,
        core: {
          locationId: row.locationId ?? undefined,
          aliveStatus: row.aliveStatus,
          knowledge: row.knowledge ?? [],
          goals: row.goals ?? [],
          loyalties: row.loyalties ?? [],
          resources: row.resources ?? [],
          conditions: row.conditions ?? []
        },
        extensions: (extensionsByBoundary.get(row.boundaryId) ?? []).map((extension) => ({
          key: extension.key,
          valueType: extension.valueType,
          value: extension.value,
          provenanceId: extension.provenanceId ?? undefined
        }))
      })
    );

    const eventRows = (
      await this.client.query<EventRow>(
        `
          SELECT
            event_id AS "eventId",
            story_id AS "storyId",
            revision_id AS "revisionId",
            event_type AS "eventType",
            is_abstract AS "abstract",
            actor_ids AS "actorIds",
            target_ids AS "targetIds",
            sequence,
            time_relation AS "timeRelation",
            anchor_event_id AS "anchorEventId",
            absolute_timestamp AS "absoluteTimestamp",
            duration_minutes AS "durationMinutes",
            min_travel_minutes AS "minTravelMinutes",
            place_id AS "placeId",
            causal_link_ids AS "causalLinkIds",
            provenance_id AS "provenanceId"
          FROM events
          WHERE story_id = $1 AND revision_id = $2
          ORDER BY sequence, event_id
        `,
        [storyId, revisionId]
      )
    ).rows;

    const preconditionRows = (
      await this.client.query<EventPreconditionRow>(
        `
          SELECT
            event_id AS "eventId",
            precondition_index AS "preconditionIndex",
            description,
            actor_id AS "actorId",
            required_rule_version_id AS "requiredRuleVersionId"
          FROM event_preconditions
          WHERE event_id IN (
            SELECT event_id FROM events WHERE story_id = $1 AND revision_id = $2
          )
          ORDER BY event_id, precondition_index
        `,
        [storyId, revisionId]
      )
    ).rows;

    const effectRows = (
      await this.client.query<EventEffectRow>(
        `
          SELECT
            effect_id AS "effectId",
            event_id AS "eventId",
            effect_index AS "effectIndex",
            description,
            provenance_id AS "provenanceId"
          FROM event_effects
          WHERE event_id IN (
            SELECT event_id FROM events WHERE story_id = $1 AND revision_id = $2
          )
          ORDER BY event_id, effect_index
        `,
        [storyId, revisionId]
      )
    ).rows;

    const stateChangeRows = (
      await this.client.query<EventStateChangeRow>(
        `
          SELECT
            effect_id AS "effectId",
            change_index AS "changeIndex",
            subject_id AS "subjectId",
            field,
            operation,
            value,
            provenance_id AS "provenanceId"
          FROM event_state_changes
          WHERE effect_id IN (
            SELECT effect_id
            FROM event_effects
            WHERE event_id IN (
              SELECT event_id FROM events WHERE story_id = $1 AND revision_id = $2
            )
          )
          ORDER BY effect_id, change_index
        `,
        [storyId, revisionId]
      )
    ).rows;

    const ruleChangeRows = (
      await this.client.query<EventRuleChangeRow>(
        `
          SELECT
            effect_id AS "effectId",
            change_index AS "changeIndex",
            rule_version_id AS "ruleVersionId",
            operation,
            provenance_id AS "provenanceId"
          FROM event_rule_changes
          WHERE effect_id IN (
            SELECT effect_id
            FROM event_effects
            WHERE event_id IN (
              SELECT event_id FROM events WHERE story_id = $1 AND revision_id = $2
            )
          )
          ORDER BY effect_id, change_index
        `,
        [storyId, revisionId]
      )
    ).rows;

    const preconditionsByEvent = new Map<string, EventPreconditionRow[]>();
    for (const row of preconditionRows) {
      const existing = preconditionsByEvent.get(row.eventId) ?? [];
      existing.push(row);
      preconditionsByEvent.set(row.eventId, existing);
    }

    const effectsByEvent = new Map<string, EventEffectRow[]>();
    for (const row of effectRows) {
      const existing = effectsByEvent.get(row.eventId) ?? [];
      existing.push(row);
      effectsByEvent.set(row.eventId, existing);
    }

    const stateChangesByEffect = new Map<string, EventStateChangeRow[]>();
    for (const row of stateChangeRows) {
      const existing = stateChangesByEffect.get(row.effectId) ?? [];
      existing.push(row);
      stateChangesByEffect.set(row.effectId, existing);
    }

    const ruleChangesByEffect = new Map<string, EventRuleChangeRow[]>();
    for (const row of ruleChangeRows) {
      const existing = ruleChangesByEffect.get(row.effectId) ?? [];
      existing.push(row);
      ruleChangesByEffect.set(row.effectId, existing);
    }

    const events = eventRows.map((row) =>
      CanonicalEventSchema.parse({
        eventId: row.eventId,
        storyId: row.storyId,
        revisionId: row.revisionId,
        eventType: row.eventType,
        abstract: row.abstract,
        actorIds: row.actorIds ?? [],
        targetIds: row.targetIds ?? [],
        sequence: row.sequence,
        time: {
          relation: row.timeRelation,
          anchorEventId: row.anchorEventId ?? undefined,
          absoluteTimestamp: row.absoluteTimestamp ?? undefined,
          durationMinutes: row.durationMinutes ?? undefined,
          minTravelMinutes: row.minTravelMinutes ?? undefined
        },
        placeId: row.placeId ?? undefined,
        preconditions: (preconditionsByEvent.get(row.eventId) ?? []).map((precondition) => ({
          description: precondition.description,
          actorId: precondition.actorId ?? undefined,
          requiredRuleVersionId: precondition.requiredRuleVersionId ?? undefined
        })),
        effects: (effectsByEvent.get(row.eventId) ?? []).map((effect) => ({
          effectId: effect.effectId,
          description: effect.description,
          provenanceId: effect.provenanceId ?? undefined,
          stateChanges: (stateChangesByEffect.get(effect.effectId) ?? []).map((change) => ({
            subjectId: change.subjectId,
            field: change.field,
            operation: change.operation,
            value: change.value,
            provenanceId: change.provenanceId ?? undefined
          })),
          ruleChanges: (ruleChangesByEffect.get(effect.effectId) ?? []).map((change) => ({
            ruleVersionId: change.ruleVersionId,
            operation: change.operation,
            provenanceId: change.provenanceId ?? undefined
          }))
        })),
        causalLinkIds: row.causalLinkIds ?? [],
        provenanceId: row.provenanceId ?? undefined
      })
    );

    const causalLinks = (
      await this.client.query<{
        linkId: string;
        storyId: string;
        revisionId: string;
        causeEventId: string;
        effectEventId: string;
        relation: string;
      }>(
        `
          SELECT
            link_id AS "linkId",
            story_id AS "storyId",
            revision_id AS "revisionId",
            cause_event_id AS "causeEventId",
            effect_event_id AS "effectEventId",
            relation
          FROM causal_links
          WHERE story_id = $1 AND revision_id = $2
          ORDER BY link_id
        `,
        [storyId, revisionId]
      )
    ).rows.map((row) => CausalLinkSchema.parse(row));

    return {
      story: StoryRecordSchema.parse(storyRow),
      revision: StoryRevisionRecordSchema.parse({
        ...revisionRow,
        basedOnRevisionId: revisionRow.basedOnRevisionId ?? undefined
      }),
      entities,
      stateBoundaries,
      events,
      causalLinks
    };
  }
}
