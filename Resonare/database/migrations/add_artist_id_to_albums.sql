-- ============================================================================
-- MIGRATION: Add Artist ID to Albums Table
-- Description: Adds artist_id column to albums table to link albums to artists
-- Date: 2025-11-12
-- ============================================================================

-- Add artist_id column to albums table
-- Note: This is nullable to support existing albums and gradual migration
ALTER TABLE public.albums 
ADD COLUMN IF NOT EXISTS artist_id TEXT;

-- Add foreign key constraint (optional, allows NULL for legacy data)
-- This creates a relationship but doesn't enforce it for existing data
ALTER TABLE public.albums 
ADD CONSTRAINT albums_artist_id_fkey 
FOREIGN KEY (artist_id) 
REFERENCES public.artists(id) 
ON DELETE SET NULL;

-- Add index on artist_id for query performance
CREATE INDEX IF NOT EXISTS idx_albums_artist_id 
ON public.albums 
USING btree (artist_id);

-- Add comment for documentation
COMMENT ON COLUMN public.albums.artist_id IS 'Foreign key to artists table (Spotify artist ID). Nullable for backward compatibility.';

-- Note: We keep the existing artist_name column for:
-- 1. Backward compatibility
-- 2. Display purposes when artist_id is not available
-- 3. Fallback for albums not yet migrated

-- ============================================================================
-- END MIGRATION
-- ============================================================================

