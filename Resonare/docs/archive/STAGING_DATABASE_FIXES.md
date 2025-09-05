# 🔧 Staging Database Fixes

## Issues Found & Fixed

### **✅ Issue 1: Environment Loading** - FIXED
- **Problem**: `Cannot read property 'SUPABASE_URL' of undefined`
- **Fix**: Created missing `src/config/env.ts` file and fixed imports

### **❌ Issue 2: Missing `favorite_albums` Table** - NEEDS MANUAL FIX
- **Problem**: `Could not find the table 'public.favorite_albums'`
- **Fix**: Added table to `schema_v2.sql`, need to create in staging database

### **❌ Issue 3: Missing `user_activities` RLS Policy** - NEEDS MANUAL FIX  
- **Problem**: `new row violates row-level security policy for table "user_activities"`
- **Fix**: Added INSERT/UPDATE/DELETE policy to schema, need to apply to staging

### **✅ Issue 4: Empty Data Handling** - FIXED
- **Problem**: `Cannot read property 'slice' of undefined` 
- **Fix**: Fixed `this.mockAlbums` → `mockAlbums` reference

## 🔧 Manual Database Updates Required

**Run this SQL in your STAGING Supabase project:**

```sql
-- 1. Add missing favorite_albums table
CREATE TABLE public.favorite_albums (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    album_id TEXT REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    ranking INTEGER NOT NULL CHECK (ranking >= 1 AND ranking <= 5),
    favorited_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One ranking per user (can be updated)
    UNIQUE(user_id, ranking),
    -- One album can only be favorited once per user
    UNIQUE(user_id, album_id)
);

-- 2. Enable RLS for favorite_albums
ALTER TABLE public.favorite_albums ENABLE ROW LEVEL SECURITY;

-- 3. Add favorite_albums policies
CREATE POLICY "Users can view own favorites" ON public.favorite_albums
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view accessible favorites" ON public.favorite_albums
    FOR SELECT USING (
        auth.uid() = user_id                     -- Own favorites
        OR EXISTS (                              -- Public profile favorites
            SELECT 1 FROM public.user_profiles 
            WHERE id = user_id AND NOT is_private
        )
        OR EXISTS (                              -- Private profile favorites (if following)
            SELECT 1 FROM public.user_follows 
            WHERE following_id = user_id 
            AND follower_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own favorites" ON public.favorite_albums
    FOR ALL USING (auth.uid() = user_id);

-- 4. Add missing user_activities INSERT policy
CREATE POLICY "Users can manage own activities" ON public.user_activities
    FOR ALL USING (auth.uid() = user_id);
```

## 🎉 Expected Results After Fix

### **✅ No More Errors:**
- No `favorite_albums` table errors
- No RLS policy errors when marking albums as listened
- No `.slice()` undefined errors

### **✅ Staging Environment Working:**
- Can create accounts in staging
- Can mark albums as listened  
- Can test all Week 5 features safely
- Separate from production data

## Next Steps

1. **Run the SQL above** in staging Supabase
2. **Test staging environment**: `ENVFILE=.env.staging npm run ios`
3. **Create test accounts** in staging
4. **Test Instagram privacy model** in staging
5. **Complete Week 5 validation**

---

**The staging environment setup is almost complete!** 🚀