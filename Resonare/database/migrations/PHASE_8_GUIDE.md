# Phase 8: Data Migration Guide

## Overview

Phase 8 handles migrating any existing album data to link albums with artists. **Most of this is already automated!**

---

## ✅ What's Already Done

1. **Album Type Updated** - `artistId` field exists in TypeScript
2. **Database Schema** - `artist_id` column exists in albums table
3. **Automatic Linking** - New albums automatically get artist IDs when fetched from Spotify
4. **Automatic Artist Storage** - Artists are saved to the database when albums are fetched

---

## 📋 Manual Steps Required in Supabase

### Step 1: Check Your Current Data State

1. Go to https://supabase.com
2. Open your Resonare project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"**
5. Run this query:

```sql
SELECT 
    COUNT(*) as total_albums,
    COUNT(artist_id) as albums_with_artist_id,
    COUNT(*) - COUNT(artist_id) as albums_needing_migration
FROM albums;
```

**Interpret Results:**

| Scenario | What It Means | Action Required |
|----------|---------------|-----------------|
| `total_albums = 0` | Fresh database, no albums yet | ✅ **Nothing to do!** New albums will work automatically |
| `albums_needing_migration = 0` | All albums already have artist IDs | ✅ **Nothing to do!** You're all set |
| `albums_needing_migration > 0` | Some albums need artist IDs | ⚠️ **Continue to Step 2** |

---

### Step 2: View Albums That Need Migration

If you have albums needing migration, see which ones:

```sql
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
```

This shows you albums that don't have artist IDs yet.

---

### Step 3: Choose Your Migration Strategy

You have **3 options**:

#### Option A: Automatic Migration (Recommended) 🌟

**Do nothing!** The app will automatically fix albums as users view them:

1. User opens an album without `artist_id`
2. App fetches album from Spotify
3. App extracts artist ID from Spotify response
4. App saves artist to `artists` table
5. App updates album with `artist_id`

**Pros:**
- Zero manual work
- Always correct data from Spotify
- Gradual, non-disruptive

**Cons:**
- Albums are migrated only when viewed
- May take time for all albums to be updated

**Best for:** Most users, especially with many albums

---

#### Option B: Manual Viewing (Moderate) 🖱️

Manually open albums in the app to trigger migration:

1. Open the Resonare app
2. Go through your album list
3. Click on each album to view details
4. The app will automatically update artist IDs

**Pros:**
- More control over timing
- Can verify each album

**Cons:**
- Time-consuming if many albums
- Manual effort required

**Best for:** Small number of albums (<50)

---

#### Option C: SQL Migration (Advanced) ⚠️

**USE WITH CAUTION** - Only if you're comfortable with SQL and know Spotify IDs.

If you manually know artist IDs from Spotify:

```sql
-- Example: Update a specific album with its artist ID
UPDATE albums 
SET artist_id = '[SPOTIFY_ARTIST_ID]'
WHERE id = '[SPOTIFY_ALBUM_ID]';

-- Also insert the artist into artists table:
INSERT INTO artists (id, name, image_url, spotify_url, genres, created_at, updated_at)
VALUES (
    '[SPOTIFY_ARTIST_ID]',
    '[ARTIST_NAME]',
    '[ARTIST_IMAGE_URL]',
    '[SPOTIFY_ARTIST_URL]',
    ARRAY['Genre1', 'Genre2'],
    now(),
    now()
)
ON CONFLICT (id) DO NOTHING;
```

To find Spotify Artist IDs:
1. Go to https://open.spotify.com
2. Search for the artist
3. Open the artist page
4. The URL will be: `https://open.spotify.com/artist/[ARTIST_ID]`
5. Copy the `[ARTIST_ID]` part

**Pros:**
- Immediate results
- Can batch update many albums

**Cons:**
- Requires manual lookup
- Error-prone
- Must know Spotify IDs

**Best for:** Developers who need immediate migration and have Spotify API knowledge

---

### Step 4: Verify Migration Success

After migration (using any method), verify it worked:

```sql
-- Check overall progress
SELECT 
    COUNT(*) as total_albums,
    COUNT(artist_id) as albums_with_artist_id,
    COUNT(*) - COUNT(artist_id) as albums_still_missing,
    ROUND(100.0 * COUNT(artist_id) / COUNT(*), 1) as percentage_complete
FROM albums;

-- Check artists table is populated
SELECT COUNT(*) as total_artists FROM artists;

-- View some linked albums
SELECT 
    albums.name as album_name,
    albums.artist_name,
    artists.name as linked_artist_name,
    artists.image_url
FROM albums
LEFT JOIN artists ON albums.artist_id = artists.id
WHERE albums.artist_id IS NOT NULL
LIMIT 10;
```

**Expected Results:**
- `percentage_complete` increases over time
- `total_artists` grows as albums are migrated
- Linked albums show matching artist names

---

## 🎯 Recommended Approach

**For most users:**

1. ✅ **Run Step 1** to check your data
2. ✅ **Choose Option A** (Automatic Migration)
3. ✅ Use the app normally
4. ✅ Albums get artist IDs as they're viewed
5. ✅ Optionally run Step 4 weekly to track progress

**No manual SQL work needed!**

---

## ⚠️ Important Notes

### Don't Delete `artist_name` Column!

The `artist_name` column should **NOT** be deleted because:
- It's used as a fallback when `artist_id` is NULL
- It displays immediately without database joins
- It supports legacy albums
- It handles multi-artist albums (comma-separated names)

### Expected Differences

Some albums may show different names:
```
artist_name: "The Beatles, Yoko Ono"
linked_artist_name: "The Beatles"
```

This is **expected** because:
- `artist_name` can include multiple artists
- `artist_id` links to the **primary** artist only
- Both are correct for different use cases

---

## 🧪 Testing Migration

### Test the Automatic Migration:

1. Find an album without `artist_id`:
   ```sql
   SELECT id, name, artist_name 
   FROM albums 
   WHERE artist_id IS NULL 
   LIMIT 1;
   ```

2. Open that album in the Resonare app

3. Navigate to Album Details screen

4. Click on the artist name (should be clickable and underlined)

5. View the artist's page

6. Go back to Supabase and check:
   ```sql
   SELECT id, name, artist_name, artist_id 
   FROM albums 
   WHERE id = '[THE_ALBUM_ID_FROM_STEP_1]';
   ```

7. Verify `artist_id` is now populated! ✅

---

## 📊 Migration Progress Tracking

Create a query to track migration over time:

```sql
-- Save this as a favorite query in Supabase
SELECT 
    'Albums' as metric,
    COUNT(*) as total,
    COUNT(artist_id) as migrated,
    COUNT(*) - COUNT(artist_id) as remaining,
    ROUND(100.0 * COUNT(artist_id) / NULLIF(COUNT(*), 0), 1) as percent_complete
FROM albums
UNION ALL
SELECT 
    'Artists' as metric,
    COUNT(*) as total,
    NULL as migrated,
    NULL as remaining,
    NULL as percent_complete
FROM artists;
```

Run this weekly to see progress!

---

## ✅ Phase 8 Completion Checklist

- [ ] Ran Step 1 query to check data state
- [ ] Decided on migration strategy (A, B, or C)
- [ ] Tested album-to-artist navigation
- [ ] Verified artist details screen works
- [ ] Confirmed artist IDs are being saved
- [ ] Checked artists table is populating

**Once tested, Phase 8 is complete!**

---

## 🆘 Troubleshooting

### Issue: Artist name not clickable in album details

**Cause:** Album doesn't have `artist_id` yet

**Solution:** 
1. Pull to refresh the album details screen
2. Or navigate away and back to the album
3. The app will fetch fresh data from Spotify

### Issue: Artist details screen shows "Artist not found"

**Cause:** Artist might not be in database yet, or Spotify ID is invalid

**Solution:**
1. Check Spotify API is configured (`spotifyService.isConfigured()`)
2. Verify the `artist_id` in the albums table is valid
3. Check Supabase logs for API errors

### Issue: No albums showing on artist details screen

**Cause:** Artist might be in database, but albums aren't linked yet

**Solution:**
1. View each album by the artist in the app
2. This will trigger automatic linking
3. Refresh the artist details screen

---

## 📝 Summary

**Phase 8 is mostly automatic!** 

- New albums: ✅ Automatic
- Legacy albums: ✅ Automatic (gradual)
- Manual work: ⚠️ Optional (only for immediate needs)

The feature works immediately, and data quality improves over time as users interact with the app. No rush to migrate everything!

---

*Phase 8 Complete - Ready for Phase 9: Testing & QA*

