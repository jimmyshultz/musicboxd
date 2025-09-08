# 🔧 Fix User Profiles RLS Policy

## The Problem

The current RLS policy on `user_profiles` is too restrictive:

```sql
CREATE POLICY "Public profiles are viewable by everyone" ON public.user_profiles
    FOR SELECT USING (NOT is_private OR auth.uid() = id);
```

This makes private profiles **only visible to the owner**, but the Instagram model requires them to be visible to **existing followers**.

## The Solution

Replace the policy with one that allows:
1. ✅ **Public profiles** → Visible to everyone
2. ✅ **Private profiles** → Visible to owner + followers

## Manual Database Fix Required

**Run this in Supabase SQL Editor:**

```sql
-- 1. Drop the existing restrictive policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.user_profiles;

-- 2. Create new policy that supports Instagram privacy model
CREATE POLICY "Instagram privacy model for profiles" ON public.user_profiles
    FOR SELECT USING (
        NOT is_private                           -- Public profiles visible to all
        OR auth.uid() = id                       -- Own profile always visible
        OR EXISTS (                              -- Private profiles visible to followers
            SELECT 1 FROM public.user_follows 
            WHERE following_id = user_profiles.id 
            AND follower_id = auth.uid()
        )
    );
```

## What This Does

- **Public profiles** (`NOT is_private`): Visible to everyone ✅
- **Own profile** (`auth.uid() = id`): Always visible to yourself ✅  
- **Private profiles**: Visible to users who follow them via `user_follows` check ✅

This perfectly implements the Instagram privacy model! 🎯

---

**After running this SQL, the privacy relationships should work correctly!**