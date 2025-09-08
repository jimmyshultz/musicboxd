# Week 4 Error Fixes

## Issues Fixed

### 1. RLS Policy Violation Error
**Error:** `new row violates row-level security policy for table "user_activities"`

**Root Cause:** 
- When users rate albums without marking them as listened, the database trigger tries to insert into `user_activities` table
- The table only had a SELECT policy but no INSERT policy
- This prevented the trigger from creating activity feed entries

**Fix:**
- Added INSERT policy to `user_activities` table in `database/schema.sql`
- Created migration file `Resonare/database/migrations/add_user_activities_insert_policy.sql`
- Created `Resonare/apply-migration.sql` for easy manual application

**Policy Added:**
```sql
CREATE POLICY "Users can create their own activities" ON public.user_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 2. Non-Serializable Redux Data Error
**Error:** `A non-serializable value was detected in an action, in the path: 'payload.dateReviewed'. Value: {}`

**Root Cause:**
- In `AlbumDetailsScreen.tsx`, when creating a new review object for the Redux store, `dateReviewed` was set to `new Date()`
- Redux requires all state to be serializable (no Date objects, functions, etc.)

**Fix:**
- Changed `dateReviewed: new Date()` to `dateReviewed: new Date().toISOString()` in `AlbumDetailsScreen.tsx` line 266
- Updated `Review` interface in `types/index.ts` to accept both `Date | string` for `dateReviewed` field
- Verified that `AlbumService.getUserReview()` and `AlbumService.addReview()` already use `serializeReview()` helper to convert dates to strings

## Files Modified

1. **database/schema.sql** - Added INSERT policy for user_activities
2. **Resonare/src/screens/Album/AlbumDetailsScreen.tsx** - Fixed non-serializable Date
3. **Resonare/src/types/index.ts** - Updated Review interface to accept string dates
4. **Resonare/database/migrations/add_user_activities_insert_policy.sql** - Migration file
5. **Resonare/apply-migration.sql** - Manual SQL script for applying the RLS policy fix

## Testing Instructions

### Apply Database Migration
Since Docker isn't available in this environment, apply the RLS policy manually:

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Run the contents of `Resonare/apply-migration.sql`:
   ```sql
   CREATE POLICY "Users can create their own activities" ON public.user_activities
       FOR INSERT WITH CHECK (auth.uid() = user_id);
   ```

### Test the Fixes
1. **Test Rating Without Listening:**
   - Open an album in the app
   - Rate it WITHOUT marking as listened first
   - Should no longer get RLS policy violation error
   - Check that the rating is saved successfully

2. **Test Redux Serialization:**
   - Rate any album
   - Should no longer see non-serializable value warnings in console
   - Verify the rating appears correctly in the UI

## Expected Behavior After Fixes
- Users can rate albums regardless of whether they've marked them as listened
- No more RLS policy violations when rating albums
- No more Redux serialization warnings
- Rating functionality works smoothly on local simulator
- Activity feed entries are created properly when users rate albums