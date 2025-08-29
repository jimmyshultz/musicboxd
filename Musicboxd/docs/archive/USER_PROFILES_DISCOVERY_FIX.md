# 🔧 User Profiles Discovery Fix

## Problem

After unfollowing a private profile, you **can't find them in search** to send a new follow request.

**Current RLS policy on `user_profiles`:**
```sql
CREATE POLICY "Instagram privacy model for profiles" ON public.user_profiles
    FOR SELECT USING (
        NOT is_private                           -- Public profiles visible to all
        OR auth.uid() = id                       -- Own profile always visible  
        OR EXISTS (                              -- ❌ Private profiles ONLY visible to current followers
            SELECT 1 FROM public.user_follows 
            WHERE following_id = user_profiles.id 
            AND follower_id = auth.uid()
        )
    );
```

**Issue**: Private profiles are **only visible to current followers**, but Instagram model should allow **discovery for follow requests**.

## Instagram Privacy Model Clarification

### **Profile Visibility** (user_profiles table):
- ✅ **Public profiles** → Visible to everyone
- ✅ **Private profiles** → **Visible to everyone for discovery/requests** 
- ✅ **Own profile** → Always visible

### **Content Visibility** (activity tables):
- ✅ **Public profiles** → Content visible to everyone
- ✅ **Private profiles** → Content **only visible to followers**
- ✅ **Own content** → Always visible

## Solution

**Make private profiles discoverable but protect their content.**

### **Step 1: Fix user_profiles policy**
```sql
-- Drop current restrictive policy
DROP POLICY IF EXISTS "Instagram privacy model for profiles" ON public.user_profiles;

-- Create new discoverable policy
CREATE POLICY "Profiles discoverable for Instagram model" ON public.user_profiles
    FOR SELECT USING (true);  -- All profiles visible for discovery
```

### **Step 2: Content protection** 
The activity table policies (already fixed) handle content privacy:
- ✅ `album_listens` → Only accessible to followers
- ✅ `album_ratings` → Only accessible to followers  
- ✅ `diary_entries` → Only accessible to followers

## Manual Database Fix

**Run this SQL in Supabase → SQL Editor:**

```sql
-- Make private profiles discoverable for follow requests
DROP POLICY IF EXISTS "Instagram privacy model for profiles" ON public.user_profiles;

CREATE POLICY "Profiles discoverable for Instagram model" ON public.user_profiles
    FOR SELECT USING (true);
```

## Expected Behavior After Fix

### **Search & Discovery** ✅
- ✅ Can **search and find** private profiles
- ✅ Can **view basic profile info** (username, display name, avatar, bio)
- ✅ Can **send follow requests** to private profiles

### **Content Protection** ✅  
- ❌ **Cannot see activity** (listens, ratings, diary entries) until following
- ❌ **Cannot see detailed stats** until following
- ✅ **Content remains protected** by activity table RLS policies

### **Follow Button States** ✅
- ✅ Shows **"Request"** for private profiles you don't follow
- ✅ Shows **"Following"** for private profiles you do follow
- ✅ Shows **"Requested"** for pending requests

---

**This completes the Instagram privacy model implementation!** 🎯