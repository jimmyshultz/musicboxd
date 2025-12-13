# Database Migrations

This directory contains SQL migration scripts for the Resonare database.

**Related Documentation**: For the complete database schema and overview, see [`../../database/README.md`](../../database/README.md)

## Migration Order

Migrations should be run in the following order:

### Artist Details Feature Migrations

1. **add_artists_table.sql** - Creates the artists table with indexes and RLS policies
2. **add_artist_id_to_albums.sql** - Adds artist_id column to albums table

## Running Migrations

### Option 1: Supabase Dashboard (SQL Editor)

1. Log into your Supabase project at https://supabase.com
2. Navigate to the SQL Editor (left sidebar)
3. Create a new query
4. Copy and paste the migration file contents
5. Click "Run" to execute
6. Verify the changes in the Table Editor

### Option 2: Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push
```

### Option 3: Direct psql Connection

```bash
# Connect to your database
psql "postgresql://[YOUR-CONNECTION-STRING]"

# Run migration
\i database/migrations/add_artists_table.sql
\i database/migrations/add_artist_id_to_albums.sql
```

## Rollback Instructions

If you need to rollback these migrations:

### Rollback add_artist_id_to_albums.sql

```sql
-- Remove foreign key constraint
ALTER TABLE public.albums DROP CONSTRAINT IF EXISTS albums_artist_id_fkey;

-- Drop index
DROP INDEX IF EXISTS idx_albums_artist_id;

-- Remove column
ALTER TABLE public.albums DROP COLUMN IF EXISTS artist_id;
```

### Rollback add_artists_table.sql

```sql
-- Drop trigger
DROP TRIGGER IF EXISTS update_artists_updated_at ON public.artists;

-- Drop policies
DROP POLICY IF EXISTS "Artists are viewable by everyone" ON public.artists;
DROP POLICY IF EXISTS "Authenticated users can insert artists" ON public.artists;
DROP POLICY IF EXISTS "Authenticated users can update artists" ON public.artists;

-- Drop indexes
DROP INDEX IF EXISTS idx_artists_name;
DROP INDEX IF EXISTS idx_artists_popularity;

-- Drop table
DROP TABLE IF EXISTS public.artists;
```

## Verification Queries

After running migrations, verify they worked correctly:

```sql
-- Check artists table exists
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'artists';

-- Check artists table structure
\d public.artists

-- Check albums table has artist_id column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'albums' 
AND column_name = 'artist_id';

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('artists', 'albums') 
AND schemaname = 'public';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'artists';

-- Check foreign key constraint
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'albums'
AND kcu.column_name = 'artist_id';
```

## Notes

- All migrations use `IF NOT EXISTS` / `IF EXISTS` clauses to be idempotent
- The `artist_id` column in albums is nullable for backward compatibility
- Existing albums will have NULL artist_id until they are migrated
- The `artist_name` column remains in albums for fallback purposes
- RLS policies follow the same pattern as the albums table

