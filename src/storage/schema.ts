import { readFileSync } from "node:fs";

import type { SqlQueryable } from "./db.js";
import { runSql } from "./db.js";

export const canonicalTableNames = [
  "stories",
  "story_revisions",
  "entities",
  "place_hierarchy",
  "character_state_boundaries",
  "state_extensions",
  "events",
  "event_preconditions",
  "event_effects",
  "event_state_changes",
  "event_rule_changes",
  "causal_links",
  "rule_packs",
  "rule_versions",
  "verdicts",
  "provenance_records"
] as const;

export type CanonicalTableName = (typeof canonicalTableNames)[number];

export function loadCanonicalMigrationSql(): string {
  return readFileSync(
    new URL("./migrations/0001_canonical_core.sql", import.meta.url),
    "utf8"
  );
}

export async function applyCanonicalSchema(client: SqlQueryable): Promise<void> {
  await runSql(client, loadCanonicalMigrationSql());
}
