# 🔧 Activity Tables RLS Policy Fix

## Problem

The RLS policies on activity tables (`album_listens`, `album_ratings`, `diary_entries`) are **too restrictive** for the Instagram privacy model.

**Current policies only allow:**
- ✅ Your own data (`auth.uid() = user_id`)
- ✅ Data from public profiles (`NOT is_private`)
- ❌ **Missing**: Data from private profiles you follow

**This is why you can see the private profile in search/stats but can't see their content!**

## Solution

Update the RLS policies to include the **follow relationship check**.

## Manual Database Fix Required

**Run this SQL in Supabase → SQL Editor:**

```sql
-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view public listens" ON public.album_listens;
DROP POLICY IF EXISTS "Users can view public ratings" ON public.album_ratings;
DROP POLICY IF EXISTS "Users can view public diary entries" ON public.diary_entries;

-- 2. Create new Instagram privacy model policies

-- Album listens - Instagram privacy model
CREATE POLICY "Users can view accessible listens" ON public.album_listens
    FOR SELECT USING (
        auth.uid() = user_id                     -- Own listens
        OR EXISTS (                              -- Public profile listens
            SELECT 1 FROM public.user_profiles 
            WHERE id = user_id AND NOT is_private
        )
        OR EXISTS (                              -- Private profile listens (if following)
            SELECT 1 FROM public.user_follows 
            WHERE following_id = user_id 
            AND follower_id = auth.uid()
        )
    );

-- Album ratings - Instagram privacy model  
CREATE POLICY "Users can view accessible ratings" ON public.album_ratings
    FOR SELECT USING (
        auth.uid() = user_id                     -- Own ratings
        OR EXISTS (                              -- Public profile ratings
            SELECT 1 FROM public.user_profiles 
            WHERE id = user_id AND NOT is_private
        )
        OR EXISTS (                              -- Private profile ratings (if following)
            SELECT 1 FROM public.user_follows 
            WHERE following_id = user_id 
            AND follower_id = auth.uid()
        )
    );

-- Diary entries - Instagram privacy model
CREATE POLICY "Users can view accessible diary entries" ON public.diary_entries
    FOR SELECT USING (
        auth.uid() = user_id                     -- Own diary entries
        OR EXISTS (                              -- Public profile diary entries
            SELECT 1 FROM public.user_profiles 
            WHERE id = user_id AND NOT is_private
        )
        OR EXISTS (                              -- Private profile diary entries (if following)
            SELECT 1 FROM public.user_follows 
            WHERE following_id = user_id 
            AND follower_id = auth.uid()
        )
    );
```

## Expected Results After Fix

### **Private Profile Page** ✅
- Should show their listens, ratings, and diary entries to followers
- Should show follower/following counts
- Should show profile information

### **Home Page Feeds** ✅  
- **"New From Friends"** → Should show diary entries from private profiles you follow
- **"Popular With Friends"** → Should include album listens from private profiles you follow
- **Social discovery** → Should include private friends' activity

### **Profile Stats** ✅
- Should show accurate listen counts, rating stats, etc.

---

**This fix implements the complete Instagram privacy model for all activity data!** 🎯