-- Migratie 006: kolommen die de app bij projecten gebruikt maar die in oudere
-- databases ontbreken (soort project en statusnotitie). Veilig om opnieuw te draaien.
-- Voer uit in Supabase SQL Editor.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'project';

ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_type_check;
ALTER TABLE projects
  ADD CONSTRAINT projects_type_check CHECK (type IN ('project', 'interne_activiteit'));

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS status_note TEXT;

-- PostgREST (de Supabase-API) direct laten weten dat er kolommen bij zijn
NOTIFY pgrst, 'reload schema';
