-- Migratie: soft archive voor projecten
-- Voer uit in Supabase SQL Editor

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS projects_archived_idx
  ON projects(user_id, archived_at);
