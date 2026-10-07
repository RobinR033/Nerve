-- Migratie: zelf te beheren hoofdcategorieën voor overlegmappen
-- (vervangt de vaste groepen Projecten / Personen / Overlegreeksen / Overig)
-- Voer uit in Supabase SQL Editor (veilig om opnieuw te draaien)

-- 1. Categorieën
CREATE TABLE IF NOT EXISTS meeting_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  -- Gedrag: 'person' = bila-herkenning, 'project' = koppeling aan Nerve-project, 'other' = gewoon
  kind        TEXT NOT NULL DEFAULT 'other' CHECK (kind IN ('project', 'person', 'other')),
  color       TEXT NOT NULL DEFAULT '#6B6157',
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS meeting_categories_user_idx ON meeting_categories(user_id, position);

-- 2. Mappen krijgen een categorie (verwijderen regelt de app: mappen gaan eerst naar een andere categorie)
ALTER TABLE meeting_folders
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES meeting_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS meeting_folders_category_idx ON meeting_folders(category_id);

-- 3. Startset: de vier oude groepen, voor elke gebruiker die nog geen categorieën heeft
INSERT INTO meeting_categories (user_id, name, kind, color, position)
SELECT u.id, d.name, d.kind, d.color, d.position
FROM auth.users u
CROSS JOIN (VALUES
  ('Projecten',      'project', '#FF5A1F', 0),
  ('Personen',       'person',  '#2E6BFF', 1),
  ('Overlegreeksen', 'other',   '#7C3AED', 2),
  ('Overig',         'other',   '#6B6157', 3)
) AS d(name, kind, color, position)
WHERE NOT EXISTS (SELECT 1 FROM meeting_categories c WHERE c.user_id = u.id);

-- 4. Bestaande mappen in de bijbehorende categorie zetten
UPDATE meeting_folders f
SET category_id = c.id
FROM meeting_categories c
WHERE f.category_id IS NULL
  AND c.user_id = f.user_id
  AND c.name = CASE f.type
    WHEN 'project' THEN 'Projecten'
    WHEN 'person'  THEN 'Personen'
    WHEN 'series'  THEN 'Overlegreeksen'
    ELSE 'Overig'
  END;

-- 5. Row Level Security
ALTER TABLE meeting_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gebruikers beheren eigen overlegcategorieën" ON meeting_categories;
CREATE POLICY "Gebruikers beheren eigen overlegcategorieën"
  ON meeting_categories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
