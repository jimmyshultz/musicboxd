# 🚨 CRITICAL: Database Schema V2 Migration Documentation

## Important Schema Change in Week 4

**BREAKING CHANGE**: The database schema was migrated from v1 to v2 in Week 4, but some Week 5 social features were implemented using the old schema structure.

## Schema V1 vs V2 Differences

### V1 Schema (OLD - NO LONGER USED)
```sql
-- Single table for all user-album interactions
CREATE TABLE public.user_albums (
    id UUID PRIMARY KEY,
    user_id UUID,
    album_id TEXT,
    rating INTEGER,
    is_listened BOOLEAN,
    listened_at TIMESTAMPTZ,
    review TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### V2 Schema (CURRENT - WHAT WE USE NOW)
```sql
-- Separate tables for different activity types

-- Simple listen status
CREATE TABLE public.album_listens (
    id UUID PRIMARY KEY,
    user_id UUID,
    album_id TEXT,
    is_listened BOOLEAN DEFAULT true,
    first_listened_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- Ratings with reviews
CREATE TABLE public.album_ratings (
    id UUID PRIMARY KEY,
    user_id UUID,
    album_id TEXT,
    rating INTEGER NOT NULL,
    review TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- Chronological diary entries
CREATE TABLE public.diary_entries (
    id UUID PRIMARY KEY,
    user_id UUID,
    album_id TEXT,
    diary_date DATE,
    rating INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- Activity feed (different structure)
CREATE TABLE public.user_activities (
    id UUID PRIMARY KEY,
    user_id UUID,
    activity_type TEXT, -- 'listen', 'rating', 'diary'
    album_id TEXT,
    reference_id UUID, -- Points to specific record
    created_at TIMESTAMPTZ
);
```

## Code Files That Need V2 Schema Updates

### 1. Database Types (CRITICAL)
File: `/workspace/Resonare/src/types/database.ts`
- Currently has V1 schema types
- Needs complete rewrite for V2 schema

### 2. Activity Service (CRITICAL)  
File: `/workspace/Resonare/src/services/activityService.ts`
- Uses old user_activities structure
- Needs to work with V2 activity structure

### 3. User Albums Service (CRITICAL)
File: `/workspace/Resonare/src/services/userAlbumsService.ts`
- Likely uses old user_albums table
- Needs to work with separate album_listens, album_ratings, diary_entries

### 4. Any Stats Services (CRITICAL)
- May be querying old user_albums table
- Need to aggregate from V2 separate tables

## V2 Schema Benefits

1. **Separation of Concerns**: Listen status, ratings, and diary are separate
2. **Better Performance**: Targeted indexes for each activity type
3. **Cleaner Data**: No mixed null values in single table
4. **Diary Feature**: Multiple entries per album with dates
5. **Activity Feed**: Reference-based system linking to specific actions

## Immediate Actions Required

### For Week 5 Completion:
1. ✅ Update database types to V2 schema
2. ✅ Fix ActivityService to use V2 user_activities structure  
3. ✅ Update any services using user_albums table
4. ✅ Ensure staging setup uses schema_v2.sql (not schema.sql)
5. ✅ Update validation scripts to check V2 tables

### For Future Weeks:
- All new features must use V2 schema
- Services must query correct V2 tables
- Always reference schema_v2.sql for database setup

## Table Migration Summary

| V1 Table | V2 Replacement | Purpose |
|----------|----------------|---------|
| `user_albums.is_listened` | `album_listens` | Simple listen status |
| `user_albums.rating` | `album_ratings` | Ratings with reviews |
| `user_albums.listened_at` | `diary_entries` | Chronological diary |
| `user_activities` | `user_activities` | Activity feed (new structure) |

## ⚠️ Warning for Developers

- **NEVER use user_albums table** - it doesn't exist in V2
- **Always use schema_v2.sql** for new database setups
- **Check existing services** before using - they may need V2 updates
- **Activity queries** are different in V2 (reference_id system)

---

*This migration was completed in Week 4 but some Week 5 social features need to be corrected to use the V2 schema properly.*