-- Voer dit uit in de Supabase SQL Editor
-- Stap 2: Vault-encryptie voor het app-specifieke wachtwoord
-- Vereist: de vorige migratie (apple_integration.sql) moet al uitgevoerd zijn

-- Vervang de tabel zodat het wachtwoord niet meer plain-text staat
-- (tabel is pas aangemaakt en heeft nog geen data)
DROP TABLE IF EXISTS apple_integrations;

CREATE TABLE apple_integrations (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  apple_id_email       TEXT NOT NULL,
  app_password_id      UUID NOT NULL,       -- verwijst naar vault.secrets (versleuteld)
  selected_list_urls   TEXT[] NOT NULL DEFAULT '{}',
  selected_list_names  TEXT[] NOT NULL DEFAULT '{}',
  last_synced_at       TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at           TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE apple_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gebruikers beheren eigen Apple integratie"
  ON apple_integrations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- RPC-functies (SECURITY DEFINER = draaien met postgres-rechten
-- zodat ze vault.secrets / vault.decrypted_secrets kunnen lezen)
-- ─────────────────────────────────────────────────────────────

-- 1. Sla integratie op en versleutel het wachtwoord
CREATE OR REPLACE FUNCTION upsert_apple_integration(
  p_apple_id_email     TEXT,
  p_app_password       TEXT,
  p_selected_list_urls TEXT[],
  p_selected_list_names TEXT[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        UUID := auth.uid();
  v_secret_id      UUID;
  v_existing_id    UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;

  -- Controleer of er al een secret opgeslagen is
  SELECT app_password_id INTO v_existing_id
    FROM apple_integrations WHERE user_id = v_user_id;

  IF v_existing_id IS NOT NULL THEN
    -- Overschrijf het bestaande vault-secret
    PERFORM vault.update_secret(v_existing_id, p_app_password);
    v_secret_id := v_existing_id;
  ELSE
    -- Maak een nieuw versleuteld secret aan
    v_secret_id := vault.create_secret(
      p_app_password,
      'apple_password_' || v_user_id::text
    );
  END IF;

  INSERT INTO apple_integrations
    (user_id, apple_id_email, app_password_id,
     selected_list_urls, selected_list_names, updated_at)
  VALUES
    (v_user_id, p_apple_id_email, v_secret_id,
     p_selected_list_urls, p_selected_list_names, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    apple_id_email       = EXCLUDED.apple_id_email,
    selected_list_urls   = EXCLUDED.selected_list_urls,
    selected_list_names  = EXCLUDED.selected_list_names,
    updated_at           = NOW();
END;
$$;

-- 2. Verwijder integratie én het vault-secret
CREATE OR REPLACE FUNCTION delete_apple_integration()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID := auth.uid();
  v_secret_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;

  SELECT app_password_id INTO v_secret_id
    FROM apple_integrations WHERE user_id = v_user_id;

  DELETE FROM apple_integrations WHERE user_id = v_user_id;

  IF v_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_secret_id;
  END IF;
END;
$$;

-- 3. Haal eigen integratie op met ontsleuteld wachtwoord (voor afvinken)
CREATE OR REPLACE FUNCTION get_my_apple_integration()
RETURNS TABLE (
  apple_id_email     TEXT,
  app_password       TEXT,
  selected_list_urls TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ai.apple_id_email,
    ds.decrypted_secret AS app_password,
    ai.selected_list_urls
  FROM apple_integrations ai
  JOIN vault.decrypted_secrets ds ON ds.id = ai.app_password_id
  WHERE ai.user_id = auth.uid();
END;
$$;

-- 4. Haal alle integraties op met ontsleutelde wachtwoorden (voor cron job)
CREATE OR REPLACE FUNCTION get_all_apple_integrations_admin()
RETURNS TABLE (
  user_id            UUID,
  apple_id_email     TEXT,
  app_password       TEXT,
  selected_list_urls TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ai.user_id,
    ai.apple_id_email,
    ds.decrypted_secret AS app_password,
    ai.selected_list_urls
  FROM apple_integrations ai
  JOIN vault.decrypted_secrets ds ON ds.id = ai.app_password_id;
END;
$$;
