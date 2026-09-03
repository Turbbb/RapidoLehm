/*
# Create rooms table (single-tenant, no auth)

1. New Tables
- `rooms`
- `id` (uuid, primary key)
- `title` (text — customer-editable room title)
- `area` (numeric — wall area in square metres)
- `product` (text — selected RapidoLehm product id)
- `grain` (text — selected surface grain)
- `color` (text — selected color column)
- `color_row` (integer — selected color row)
- `custom_hex` (text — optional custom color)
- `additives` (jsonb — selected effects)
- `technique` (text — selected processing technique)
- `lighting` (text — selected lighting)
- `image_data` (text — room photo or generated image data URL)
- `created_at` and `updated_at` (timestamptz)

2. Security
- Enable RLS on `rooms`.
- Allow anon + authenticated CRUD because this app has no sign-in and intentionally stores the customer's shared project data.
*/

CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Raum 1',
  area numeric NOT NULL DEFAULT 0,
  product text NOT NULL DEFAULT 'lehmedelputz',
  grain text NOT NULL DEFAULT 'extrafein',
  color text NOT NULL DEFAULT 'A',
  color_row integer NOT NULL DEFAULT 1,
  custom_hex text,
  additives jsonb NOT NULL DEFAULT '[]'::jsonb,
  technique text NOT NULL DEFAULT 'gerollt',
  lighting text NOT NULL DEFAULT 'mittagsonne',
  image_data text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_rooms" ON rooms;
CREATE POLICY "anon_select_rooms" ON rooms FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_rooms" ON rooms;
CREATE POLICY "anon_insert_rooms" ON rooms FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_rooms" ON rooms;
CREATE POLICY "anon_update_rooms" ON rooms FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_rooms" ON rooms;
CREATE POLICY "anon_delete_rooms" ON rooms FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS rooms_updated_at_idx ON rooms (updated_at DESC);
