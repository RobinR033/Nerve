-- Migratie: project board feature
-- Voer uit in Supabase SQL Editor

-- 1. Status notitie per project
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS status_note TEXT;

-- 2. Weekkoppelingen voor taken (los van deadline)
CREATE TABLE IF NOT EXISTS task_planning (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  week       TEXT NOT NULL, -- bijv. "2026-W17"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id)  -- taak zit in max 1 week tegelijk
);

ALTER TABLE task_planning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Eigen planning lezen"
  ON task_planning FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Eigen planning aanmaken"
  ON task_planning FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Eigen planning bijwerken"
  ON task_planning FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Eigen planning verwijderen"
  ON task_planning FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS task_planning_user_idx ON task_planning(user_id);
