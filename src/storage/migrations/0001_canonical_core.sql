CREATE TABLE IF NOT EXISTS stories (
  story_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  default_rule_pack_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS story_revisions (
  revision_id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(story_id),
  based_on_revision_id TEXT REFERENCES story_revisions(revision_id),
  source_kind TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS entities (
  entity_id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(story_id),
  revision_id TEXT NOT NULL REFERENCES story_revisions(revision_id),
  entity_kind TEXT NOT NULL,
  name TEXT NOT NULL,
  aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS place_hierarchy (
  place_id TEXT PRIMARY KEY REFERENCES entities(entity_id),
  parent_place_id TEXT REFERENCES entities(entity_id)
);

CREATE TABLE IF NOT EXISTS character_state_boundaries (
  boundary_id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(story_id),
  revision_id TEXT NOT NULL REFERENCES story_revisions(revision_id),
  character_id TEXT NOT NULL REFERENCES entities(entity_id),
  sequence INTEGER NOT NULL,
  boundary_kind TEXT NOT NULL,
  anchor_event_id TEXT,
  location_id TEXT,
  alive_status TEXT NOT NULL,
  knowledge JSONB NOT NULL DEFAULT '[]'::jsonb,
  goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  loyalties JSONB NOT NULL DEFAULT '[]'::jsonb,
  resources JSONB NOT NULL DEFAULT '[]'::jsonb,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  provenance_id TEXT
);

CREATE TABLE IF NOT EXISTS state_extensions (
  boundary_id TEXT NOT NULL REFERENCES character_state_boundaries(boundary_id),
  extension_key TEXT NOT NULL,
  value_type TEXT NOT NULL,
  value JSONB NOT NULL,
  provenance_id TEXT,
  PRIMARY KEY (boundary_id, extension_key)
);

CREATE TABLE IF NOT EXISTS events (
  event_id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(story_id),
  revision_id TEXT NOT NULL REFERENCES story_revisions(revision_id),
  event_type TEXT NOT NULL,
  is_abstract BOOLEAN NOT NULL DEFAULT FALSE,
  actor_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  sequence INTEGER NOT NULL,
  time_relation TEXT NOT NULL,
  anchor_event_id TEXT,
  absolute_timestamp TEXT,
  duration_minutes INTEGER,
  min_travel_minutes INTEGER,
  place_id TEXT,
  causal_link_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  provenance_id TEXT
);

CREATE TABLE IF NOT EXISTS event_preconditions (
  event_id TEXT NOT NULL REFERENCES events(event_id),
  precondition_index INTEGER NOT NULL,
  description TEXT NOT NULL,
  actor_id TEXT,
  required_rule_version_id TEXT,
  PRIMARY KEY (event_id, precondition_index)
);

CREATE TABLE IF NOT EXISTS event_effects (
  effect_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(event_id),
  effect_index INTEGER NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  provenance_id TEXT
);

CREATE TABLE IF NOT EXISTS event_state_changes (
  effect_id TEXT NOT NULL REFERENCES event_effects(effect_id),
  change_index INTEGER NOT NULL,
  subject_id TEXT NOT NULL,
  field TEXT NOT NULL,
  operation TEXT NOT NULL,
  value JSONB NOT NULL,
  provenance_id TEXT,
  PRIMARY KEY (effect_id, change_index)
);

CREATE TABLE IF NOT EXISTS event_rule_changes (
  effect_id TEXT NOT NULL REFERENCES event_effects(effect_id),
  change_index INTEGER NOT NULL,
  rule_version_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  provenance_id TEXT,
  PRIMARY KEY (effect_id, change_index)
);

CREATE TABLE IF NOT EXISTS causal_links (
  link_id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(story_id),
  revision_id TEXT NOT NULL REFERENCES story_revisions(revision_id),
  cause_event_id TEXT NOT NULL REFERENCES events(event_id),
  effect_event_id TEXT NOT NULL REFERENCES events(event_id),
  relation TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rule_packs (
  rule_pack_id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(story_id),
  revision_id TEXT NOT NULL REFERENCES story_revisions(revision_id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  world_affiliation TEXT NOT NULL,
  scope TEXT NOT NULL,
  scope_target_id TEXT,
  priority INTEGER NOT NULL,
  active BOOLEAN NOT NULL,
  source_kind TEXT NOT NULL,
  source_text TEXT NOT NULL,
  default_physics BOOLEAN NOT NULL DEFAULT FALSE,
  provenance_id TEXT
);

CREATE TABLE IF NOT EXISTS rule_versions (
  rule_version_id TEXT PRIMARY KEY,
  rule_pack_id TEXT NOT NULL REFERENCES rule_packs(rule_pack_id),
  executable_kind TEXT NOT NULL,
  executable_ref TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  effects JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_status TEXT NOT NULL,
  provenance_id TEXT
);

CREATE TABLE IF NOT EXISTS verdicts (
  verdict_id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(story_id),
  revision_id TEXT NOT NULL REFERENCES story_revisions(revision_id),
  verdict_kind TEXT NOT NULL,
  category TEXT NOT NULL,
  explanation TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS provenance_records (
  provenance_id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb
);
