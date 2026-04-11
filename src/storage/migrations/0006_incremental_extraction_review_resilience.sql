CREATE TABLE IF NOT EXISTS ingestion_segment_attempts (
  attempt_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES ingestion_sessions(session_id) ON DELETE CASCADE,
  segment_id TEXT NOT NULL REFERENCES ingestion_segments(segment_id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  request_kind TEXT NOT NULL,
  status TEXT NOT NULL,
  invalidated_approval BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  error_summary TEXT,
  candidate_snapshot JSONB,
  UNIQUE (session_id, segment_id, attempt_number)
);

ALTER TABLE ingestion_segments
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE ingestion_segments
  ADD COLUMN IF NOT EXISTS last_extraction_at TEXT;

ALTER TABLE ingestion_segments
  ADD COLUMN IF NOT EXISTS last_attempt_status TEXT;

ALTER TABLE ingestion_segments
  ADD COLUMN IF NOT EXISTS last_failure_summary TEXT;

ALTER TABLE ingestion_segments
  ADD COLUMN IF NOT EXISTS stale BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE ingestion_segments
  ADD COLUMN IF NOT EXISTS stale_reason TEXT;

ALTER TABLE ingestion_segments
  ADD COLUMN IF NOT EXISTS current_attempt_id TEXT;

CREATE INDEX IF NOT EXISTS ingestion_segment_attempts_session_segment_attempt_idx
  ON ingestion_segment_attempts (session_id, segment_id, attempt_number);

CREATE INDEX IF NOT EXISTS ingestion_segments_session_state_stale_idx
  ON ingestion_segments (session_id, workflow_state, stale);
