-- Migration: Add Deezer alternate keys for the Spotify -> Deezer API migration
-- Created: 2026-07-11
--
-- Existing albums/artists rows are keyed by Spotify IDs and referenced by FKs
-- from user data (ratings, listens, diary entries, favorites). Those rows are
-- never re-keyed. Instead, Deezer becomes an ALTERNATE key:
--   - upc:       barcode backfilled from Spotify while API access lasts
--                (used to hard-match albums across providers)
--   - deezer_id: resolved via Deezer's UPC lookup (api.deezer.com/album/upc:{upc})
--
-- New albums discovered via Deezer search insert with id = 'dz:' || deezer_id,
-- but only after failing to resolve an existing row by deezer_id, then by upc.

-- Albums: UPC + Deezer id
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS upc text;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS deezer_id text;

COMMENT ON COLUMN public.albums.upc IS
  'Barcode (UPC/EAN). Backfilled from Spotify external_ids; used to dedupe albums across providers.';
COMMENT ON COLUMN public.albums.deezer_id IS
  'Deezer album id (numeric, stored as text). Alternate key; unique when present.';

-- Unique when present (Postgres unique indexes permit multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_albums_deezer_id_unique
  ON public.albums (deezer_id);

-- Non-unique: legitimate duplicates may already share a UPC (pre-existing
-- Spotify-era duplicate rows, reissues). The backfill report surfaces these.
CREATE INDEX IF NOT EXISTS idx_albums_upc ON public.albums (upc);

-- Artists: Deezer id
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS deezer_id text;

COMMENT ON COLUMN public.artists.deezer_id IS
  'Deezer artist id (numeric, stored as text). Alternate key; unique when present.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_artists_deezer_id_unique
  ON public.artists (deezer_id);
