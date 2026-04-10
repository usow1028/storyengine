ALTER TABLE verdict_runs
ADD COLUMN IF NOT EXISTS inspection_snapshot JSONB;
