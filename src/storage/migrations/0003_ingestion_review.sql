CREATE TABLE IF NOT EXISTS ingestion_sessions (
  session_id TEXT PRIMARY KEY,
  story_id TEXT,
  revision_id TEXT,
  draft_title TEXT NOT NULL DEFAULT '',
  default_rule_pack_name TEXT NOT NULL DEFAULT 'reality-default',
  input_kind TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  workflow_state TEXT NOT NULL,
  prompt_family TEXT NOT NULL,
  model_name TEXT NOT NULL,
  last_verdict_run_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_checked_at TEXT
);

CREATE TABLE IF NOT EXISTS ingestion_segments (
  segment_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES ingestion_sessions(session_id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  label TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  segment_text TEXT NOT NULL,
  workflow_state TEXT NOT NULL,
  approved_at TEXT
);

CREATE TABLE IF NOT EXISTS ingestion_candidates (
  candidate_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES ingestion_sessions(session_id) ON DELETE CASCADE,
  segment_id TEXT NOT NULL REFERENCES ingestion_segments(segment_id) ON DELETE CASCADE,
  candidate_kind TEXT NOT NULL,
  canonical_key TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL,
  review_needed BOOLEAN NOT NULL DEFAULT FALSE,
  review_needed_reason TEXT,
  source_span_start INTEGER NOT NULL,
  source_span_end INTEGER NOT NULL,
  provenance_detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  extracted_payload JSONB NOT NULL,
  corrected_payload JSONB,
  normalized_payload JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS ingestion_segments_session_sequence_idx
  ON ingestion_segments (session_id, sequence);

CREATE INDEX IF NOT EXISTS ingestion_segments_session_state_idx
  ON ingestion_segments (session_id, workflow_state);

CREATE INDEX IF NOT EXISTS ingestion_candidates_session_segment_idx
  ON ingestion_candidates (session_id, segment_id);

CREATE INDEX IF NOT EXISTS ingestion_candidates_session_key_idx
  ON ingestion_candidates (session_id, canonical_key);
