CREATE TABLE IF NOT EXISTS verdict_runs (
  run_id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(story_id),
  revision_id TEXT NOT NULL REFERENCES story_revisions(revision_id),
  previous_run_id TEXT REFERENCES verdict_runs(run_id),
  trigger_kind TEXT NOT NULL,
  created_at TEXT NOT NULL
);

ALTER TABLE verdicts
ADD COLUMN IF NOT EXISTS run_id TEXT REFERENCES verdict_runs(run_id);

CREATE INDEX IF NOT EXISTS verdict_runs_story_revision_created_idx
  ON verdict_runs (story_id, revision_id, created_at);

CREATE INDEX IF NOT EXISTS verdicts_run_id_idx
  ON verdicts (run_id, created_at);
