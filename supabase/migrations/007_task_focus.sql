-- Migratie 007: focus — zelf gekozen acties die bovenaan het dashboard staan.
-- Blijft staan tot je de taak afrondt of uit focus haalt (geen automatisch verval).
-- Voer uit in Supabase SQL Editor (veilig om opnieuw te draaien).

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS focused_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS tasks_focus_idx ON tasks(user_id) WHERE focused_at IS NOT NULL;
