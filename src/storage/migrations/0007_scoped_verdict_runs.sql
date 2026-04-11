ALTER TABLE verdict_runs
ADD COLUMN IF NOT EXISTS scope_id TEXT;

ALTER TABLE verdict_runs
ADD COLUMN IF NOT EXISTS scope_kind TEXT;

ALTER TABLE verdict_runs
ADD COLUMN IF NOT EXISTS comparison_scope_key TEXT;

ALTER TABLE verdict_runs
ADD COLUMN IF NOT EXISTS scope_payload JSONB;

CREATE INDEX IF NOT EXISTS verdict_runs_story_scope_created_idx
  ON verdict_runs (story_id, comparison_scope_key, created_at);
