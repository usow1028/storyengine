import { readdirSync, readFileSync } from "node:fs";

import type { SqlQueryable } from "./db.js";
import { runSql } from "./db.js";

export const canonicalTableNames = [
  "stories",
  "story_revisions",
  "ingestion_sessions",
  "ingestion_segments",
  "ingestion_candidates",
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
  "verdict_runs",
  "verdicts",
  "provenance_records"
] as const;

export type CanonicalTableName = (typeof canonicalTableNames)[number];

export function loadCanonicalMigrationSql(): string {
  const migrationsDir = new URL("./migrations/", import.meta.url);
  const migrationFiles = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort();

  return migrationFiles
    .map((file) => readFileSync(new URL(`./migrations/${file}`, import.meta.url), "utf8"))
    .join("\n\n");
}

export async function applyCanonicalSchema(client: SqlQueryable): Promise<void> {
  await runSql(client, loadCanonicalMigrationSql());
}
