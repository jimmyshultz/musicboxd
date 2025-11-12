-- ============================================================================
-- MIGRATION: Backfill Artist IDs for Existing Albums
-- Description: Updates existing albums to link them to artists table
-- Date: 2025-11-12
-- Status: OPTIONAL - Only needed if you have existing albums without artist_id
-- ============================================================================

-- This migration helps link existing albums to artists by:
-- 1. Finding albums that don't have artist_id set
-- 2. Creating/finding artist records based on artist_name
-- 3. Linking albums to artists

-- ============================================================================
-- STEP 1: Check how many albums need migration
-- ============================================================================

-- Run this query to see if you need to run the migration
SELECT 
    COUNT(*) as total_albums,
    COUNT(artist_id) as albums_with_artist_id,
    COUNT(*) - COUNT(artist_id) as albums_needing_migration
FROM albums;

-- If albums_needing_migration is 0, you don't need to run this migration!

-- ============================================================================
-- STEP 2: See which albums need migration
-- ============================================================================

-- Preview albums that need artist IDs
SELECT 
    id,
    name,
    artist_name,
    artist_id,
    release_date
FROM albums
WHERE artist_id IS NULL
ORDER BY name
LIMIT 20;

-- ============================================================================
-- STEP 3: Manual Migration Approach
-- ============================================================================

-- IMPORTANT: This migration requires the Spotify API to work properly.
-- The app will automatically fetch and link artists when albums are accessed.

-- OPTION A: Automatic Migration (Recommended)
-- Simply use the app normally. When users view albums:
-- 1. The app fetches full album data from Spotify
-- 2. Artist information is automatically extracted and saved
-- 3. The artist_id is automatically linked
-- This happens in AlbumService.getAlbumById() which we updated in Phase 4

-- OPTION B: Force Migration via SQL (Advanced - USE WITH CAUTION)
-- If you have a small number of albums and know their Spotify IDs are correct:

-- Example: If you know album '7ouMYWpwJ422jRcDASZB7P' has artist '4Z8W4fKeB5YxbusRsdQVPb'
-- UPDATE albums 
-- SET artist_id = '4Z8W4fKeB5YxbusRsdQVPb'
-- WHERE id = '7ouMYWpwJ422jRcDASZB7P';

-- To find artist IDs from Spotify:
-- 1. Go to https://open.spotify.com
-- 2. Search for the artist
-- 3. The URL will be: https://open.spotify.com/artist/[ARTIST_ID]
-- 4. Copy the ARTIST_ID and use it in the UPDATE statement

-- ============================================================================
-- STEP 4: Verify Migration
-- ============================================================================

-- After migration (either automatic or manual), verify the results:
SELECT 
    COUNT(*) as total_albums,
    COUNT(artist_id) as albums_with_artist_id,
    COUNT(*) - COUNT(artist_id) as albums_still_missing_artist_id,
    ROUND(100.0 * COUNT(artist_id) / COUNT(*), 1) as percentage_complete
FROM albums;

-- Check if artists table is populated:
SELECT COUNT(*) as total_artists FROM artists;

-- View some linked albums and their artists:
SELECT 
    albums.id as album_id,
    albums.name as album_name,
    albums.artist_name,
    albums.artist_id,
    artists.name as linked_artist_name,
    artists.image_url as artist_image
FROM albums
LEFT JOIN artists ON albums.artist_id = artists.id
WHERE albums.artist_id IS NOT NULL
LIMIT 10;

-- ============================================================================
-- STEP 5: Clean Up (Optional)
-- ============================================================================

-- The artist_name column is kept for backward compatibility and display purposes.
-- DO NOT DROP IT - it's used as a fallback when artist_id is not available.

-- Verify data consistency:
-- Check if any artist_name doesn't match the linked artist
SELECT 
    albums.name as album_name,
    albums.artist_name as stored_artist_name,
    artists.name as linked_artist_name
FROM albums
JOIN artists ON albums.artist_id = artists.id
WHERE albums.artist_name != artists.name
LIMIT 10;

-- Note: Some differences are expected (e.g., "The Beatles" vs "Beatles", 
-- or multiple artists on an album vs primary artist in artists table)

-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. The app handles artist linking automatically going forward
-- 2. Legacy albums will get artist_id populated when viewed in the app
-- 3. You can also manually trigger this by accessing albums via the API
-- 4. The artist_name column remains as a fallback and for display

-- ============================================================================
-- END MIGRATION
-- ============================================================================

