-- Migration: Backfill artist_id for albums that have NULL artist_id
-- Created: 2026-01-20
-- Purpose: Fix albums that were inserted without artist_id populated
-- by matching artist_name to an existing artist in the artists table

-- Update albums where artist_id is NULL but we have a matching artist by name
UPDATE albums a
SET artist_id = art.id,
    updated_at = now()
FROM artists art
WHERE a.artist_id IS NULL
  AND a.artist_name = art.name;

-- Log how many were updated (for manual verification)
DO $$
DECLARE
  updated_count INTEGER;
  remaining_null INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_null FROM albums WHERE artist_id IS NULL;
  RAISE NOTICE 'Albums still with NULL artist_id: %', remaining_null;
END $$;
