-- Migratie: overleggen (transcripties/aantekeningen), mappen en actiesuggesties
-- Voer uit in Supabase SQL Editor (veilig om opnieuw te draaien)

-- 1. Mappen — lagenstructuur à la OneNote (project / persoon / overlegreeks / overig)
CREATE TABLE IF NOT EXISTS meeting_folders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'other'
              CHECK (type IN ('project', 'person', 'series', 'other')),
  -- Submappen: verwijderen van een bovenliggende map maakt kinderen top-level
  parent_id   UUID REFERENCES meeting_folders(id) ON DELETE SET NULL,
  -- Optioneel gekoppeld aan een Nerve-project (taken uit dit overleg krijgen dat project)
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS meeting_folders_user_idx ON meeting_folders(user_id);

-- 2. Overleggen
CREATE TABLE IF NOT EXISTS meetings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Id uit de bron (bijv. job-id van de transcriptie-tool) → maakt aanleveren idempotent
  external_id          TEXT,
  source               TEXT NOT NULL DEFAULT 'handmatig',
  title                TEXT NOT NULL,
  held_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  participants         TEXT[] NOT NULL DEFAULT '{}',
  summary              TEXT,
  -- Volledig transcript is optioneel (privacy: bron mag alleen samenvatting sturen)
  transcript           TEXT,
  -- Vaste plek (null = Ongesorteerd)
  folder_id            UUID REFERENCES meeting_folders(id) ON DELETE SET NULL,
  -- Voorstel van Nerve; pas definitief na bevestiging (AI is assistent, niet baas)
  suggested_folder_id  UUID REFERENCES meeting_folders(id) ON DELETE SET NULL,
  folder_reason        TEXT,
  -- Hint uit de bron, bijv. map gekozen in de iPhone-Shortcut
  folder_hint          TEXT,
  reviewed_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, external_id)
);

CREATE INDEX IF NOT EXISTS meetings_user_held_idx ON meetings(user_id, held_at DESC);
CREATE INDEX IF NOT EXISTS meetings_folder_idx ON meetings(folder_id);
CREATE INDEX IF NOT EXISTS meetings_unreviewed_idx ON meetings(user_id) WHERE reviewed_at IS NULL;

DROP TRIGGER IF EXISTS meetings_updated_at ON meetings;
CREATE TRIGGER meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. Actiesuggesties uit overleggen
CREATE TABLE IF NOT EXISTS action_suggestions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  -- 'me' = actie voor mij, 'other' = ligt bij iemand anders (najagen)
  owner       TEXT NOT NULL DEFAULT 'me' CHECK (owner IN ('me', 'other')),
  person      TEXT,
  deadline    TIMESTAMPTZ,
  -- Letterlijk citaat uit transcript/verslag als onderbouwing
  quote       TEXT,
  status      TEXT NOT NULL DEFAULT 'suggested'
              CHECK (status IN ('suggested', 'accepted', 'rejected')),
  task_id     UUID REFERENCES tasks(id) ON DELETE SET NULL,
  decided_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS action_suggestions_meeting_idx ON action_suggestions(meeting_id);
CREATE INDEX IF NOT EXISTS action_suggestions_open_idx ON action_suggestions(user_id) WHERE status = 'suggested';

-- 4. Taken: naja (wacht op) + herkomst
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS waiting_for TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL;

-- 5. Row Level Security
ALTER TABLE meeting_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gebruikers beheren eigen overlegmappen" ON meeting_folders;
CREATE POLICY "Gebruikers beheren eigen overlegmappen"
  ON meeting_folders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Gebruikers beheren eigen overleggen" ON meetings;
CREATE POLICY "Gebruikers beheren eigen overleggen"
  ON meetings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Gebruikers beheren eigen actiesuggesties" ON action_suggestions;
CREATE POLICY "Gebruikers beheren eigen actiesuggesties"
  ON action_suggestions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
