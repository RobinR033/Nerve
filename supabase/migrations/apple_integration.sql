-- Voer dit uit in de Supabase SQL Editor
-- Apple Reminders (CalDAV) integratie

-- 1. Voeg apple_reminder_uid toe aan tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS apple_reminder_uid TEXT;
CREATE INDEX IF NOT EXISTS tasks_apple_reminder_uid_idx ON tasks (apple_reminder_uid) WHERE apple_reminder_uid IS NOT NULL;

-- 2. Maak apple_integrations tabel aan
CREATE TABLE IF NOT EXISTS apple_integrations (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  apple_id_email TEXT NOT NULL,
  -- app-specifiek wachtwoord (geen echt Apple ID-wachtwoord)
  -- Gebruik Supabase Vault in productie voor extra encryptie
  app_password   TEXT NOT NULL,
  -- URLs van geselecteerde Reminders-lijsten (CalDAV calendar URLs)
  selected_list_urls   TEXT[] NOT NULL DEFAULT '{}',
  selected_list_names  TEXT[] NOT NULL DEFAULT '{}',
  last_synced_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Row Level Security
ALTER TABLE apple_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gebruikers beheren eigen Apple integratie"
  ON apple_integrations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
