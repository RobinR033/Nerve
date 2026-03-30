-- Migratie: planning feature
-- Voer dit uit in Supabase SQL Editor

-- 1. Voeg type kolom toe aan projects tabel
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'project'
  CHECK (type IN ('project', 'interne_activiteit'));

-- 2. Maak allocations tabel aan
CREATE TABLE IF NOT EXISTS allocations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  week        TEXT NOT NULL, -- bijv. "2026-W14"
  halfdays    NUMERIC(4,1) NOT NULL DEFAULT 0 CHECK (halfdays >= 0 AND halfdays <= 10),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_id, week)
);

-- 3. RLS voor allocations
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gebruiker ziet eigen allocaties"
  ON allocations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Gebruiker kan eigen allocaties aanmaken"
  ON allocations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Gebruiker kan eigen allocaties bijwerken"
  ON allocations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Gebruiker kan eigen allocaties verwijderen"
  ON allocations FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Index voor snelle week-lookups
CREATE INDEX IF NOT EXISTS allocations_user_week_idx ON allocations(user_id, week);
