CREATE TABLE IF NOT EXISTS draft_documents (
  document_id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS draft_revisions (
  draft_revision_id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES draft_documents(document_id) ON DELETE CASCADE,
  story_id TEXT NOT NULL,
  revision_id TEXT NOT NULL,
  based_on_draft_revision_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS draft_sections (
  section_id TEXT PRIMARY KEY,
  draft_revision_id TEXT NOT NULL REFERENCES draft_revisions(draft_revision_id) ON DELETE CASCADE,
  section_kind TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  label TEXT NOT NULL,
  source_text_ref JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS draft_check_scopes (
  scope_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES ingestion_sessions(session_id) ON DELETE CASCADE,
  draft_revision_id TEXT NOT NULL REFERENCES draft_revisions(draft_revision_id) ON DELETE CASCADE,
  scope_kind TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TEXT NOT NULL
);

ALTER TABLE ingestion_sessions
  ADD COLUMN IF NOT EXISTS draft_document_id TEXT;

ALTER TABLE ingestion_sessions
  ADD COLUMN IF NOT EXISTS draft_revision_id TEXT;

ALTER TABLE ingestion_segments
  ADD COLUMN IF NOT EXISTS draft_revision_id TEXT;

ALTER TABLE ingestion_segments
  ADD COLUMN IF NOT EXISTS section_id TEXT;

ALTER TABLE ingestion_segments
  ADD COLUMN IF NOT EXISTS draft_path JSONB;

ALTER TABLE ingestion_segments
  ADD COLUMN IF NOT EXISTS source_text_ref JSONB;

CREATE INDEX IF NOT EXISTS draft_revisions_document_idx
  ON draft_revisions (document_id);

CREATE INDEX IF NOT EXISTS draft_sections_revision_sequence_idx
  ON draft_sections (draft_revision_id, sequence);

CREATE INDEX IF NOT EXISTS draft_check_scopes_session_idx
  ON draft_check_scopes (session_id);

CREATE INDEX IF NOT EXISTS ingestion_segments_draft_section_idx
  ON ingestion_segments (draft_revision_id, section_id, sequence);
