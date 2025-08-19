# Database Troubleshooting Guide

## 🚨 **Current Error Analysis**

The error you're seeing indicates that the database schema hasn't been fully applied to your Supabase project:

```
Could not find a relationship between 'user_follows' and 'user_profiles' in the schema cache
```

## 🔍 **Check Your Database Schema**

### **Step 1: Verify Tables Exist**

1. **Go to your Supabase Dashboard**
2. **Navigate to Table Editor**
3. **Check if these tables exist:**
   - ✅ `user_profiles`
   - ✅ `albums` 
   - ✅ `user_albums`
   - ✅ `user_follows`
   - ✅ `user_activities`

### **Step 2: Apply Database Schema (If Missing)**

If the tables don't exist:

1. **Go to SQL Editor** in your Supabase dashboard
2. **Copy the entire contents** of `/workspace/database/schema.sql`
3. **Run the SQL script** to create all tables and relationships

### **Step 3: Check Table Structure**

If tables exist but relationships are missing, verify the `user_follows` table has:

```sql
-- Expected structure for user_follows table
CREATE TABLE public.user_follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent self-follows and duplicate follows
    CHECK (follower_id != following_id),
    UNIQUE(follower_id, following_id)
);
```

## 🛠️ **Quick Fix Applied**

I've updated the UserService to use a simpler approach that doesn't rely on foreign key relationship names:

- **Before**: Used complex JOIN queries with foreign key hints
- **After**: Uses simple queries that first get IDs, then fetch profiles

This should work even if the foreign key relationships aren't perfectly configured.

## 🧪 **Test the Fix**

1. **Restart your React Native app**:
   ```bash
   npx react-native start --reset-cache
   npm run ios
   ```

2. **Try navigating to the Profile screen again**

## 📊 **If You Still Get Errors**

The most likely causes are:

### **Missing Tables**
- **Solution**: Apply the database schema from `/workspace/database/schema.sql`

### **Empty Tables**
- **Expected**: This is normal for a new database
- **Result**: Methods will return empty arrays but won't crash

### **Permission Issues**
- **Check**: Row Level Security policies are applied
- **Verify**: User authentication is working

## 🔧 **Manual Database Setup (Alternative)**

If you prefer to create tables manually:

### **1. Create user_profiles table:**
```sql
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **2. Create user_follows table:**
```sql
CREATE TABLE public.user_follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (follower_id != following_id),
    UNIQUE(follower_id, following_id)
);
```

### **3. Enable Row Level Security:**
```sql
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Add basic policies
CREATE POLICY "Public profiles are viewable" ON public.user_profiles
    FOR SELECT USING (NOT is_private);

CREATE POLICY "Users can manage own follows" ON public.user_follows
    FOR ALL USING (auth.uid() = follower_id);
```

## ✅ **Expected Result**

After applying the fix:
- ✅ Profile screen loads without errors
- ✅ Follower/following counts show (likely 0 for new database)
- ✅ No more foreign key relationship errors
- ✅ App doesn't crash when accessing social features