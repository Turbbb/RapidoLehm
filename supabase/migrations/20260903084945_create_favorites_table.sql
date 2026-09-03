/*
# Create favorites table (single-tenant, no auth)

1. New Tables
- `favorites`
- `id` (uuid, primary key)
- `name` (text, not null — user-editable color name, AI suggests initial value)
- `color_label` (text — e.g. "A1" or "Custom")
- `color_hex` (text — hex color value)
- `recipe` (jsonb — pigment mixing recipe with weiss, gelb, orange, rot, blau, gruen, rehbraun, moccabraun, schwarz)
- `grain` (text — grain id e.g. "extrafein")
- `technique` (text — technique id e.g. "gerollt")
- `additives` (jsonb — array of additive ids)
- `lighting` (text — lighting id)
- `image_data` (text — base64 data URL of the generated/edited image)
- `created_at` (timestamptz, default now)

2. Security
- Enable RLS on `favorites`.
- Allow anon + authenticated CRUD because the data is intentionally shared/public (no sign-in app).
*/

CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Neue Favoritin',
  color_label text NOT NULL DEFAULT '',
  color_hex text NOT NULL DEFAULT '#E8E4D8',
  recipe jsonb NOT NULL DEFAULT '{}'::jsonb,
  grain text NOT NULL DEFAULT 'extrafein',
  technique text NOT NULL DEFAULT 'gerollt',
  additives jsonb NOT NULL DEFAULT '[]'::jsonb,
  lighting text NOT NULL DEFAULT 'mittagsonne',
  image_data text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_favorites" ON favorites;
CREATE POLICY "anon_select_favorites" ON favorites FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_favorites" ON favorites;
CREATE POLICY "anon_insert_favorites" ON favorites FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_favorites" ON favorites;
CREATE POLICY "anon_update_favorites" ON favorites FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_favorites" ON favorites;
CREATE POLICY "anon_delete_favorites" ON favorites FOR DELETE
  TO anon, authenticated USING (true);
