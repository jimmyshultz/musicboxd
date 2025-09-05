# 📥 Export RLS Policies from Production Database

## Method 1: Export All Policies via SQL Query

**Run this in your PRODUCTION Supabase SQL Editor:**

```sql
-- Export all RLS policies for your tables
SELECT 
    'CREATE POLICY "' || policyname || '" ON ' || schemaname || '.' || tablename ||
    CASE 
        WHEN cmd = 'SELECT' THEN ' FOR SELECT'
        WHEN cmd = 'INSERT' THEN ' FOR INSERT' 
        WHEN cmd = 'UPDATE' THEN ' FOR UPDATE'
        WHEN cmd = 'DELETE' THEN ' FOR DELETE'
        WHEN cmd = '*' THEN ' FOR ALL'
        ELSE ' FOR ' || cmd
    END ||
    CASE 
        WHEN cmd IN ('INSERT', 'UPDATE') AND qual IS NOT NULL THEN ' WITH CHECK (' || qual || ');'
        WHEN qual IS NOT NULL THEN ' USING (' || qual || ');'
        ELSE ';'
    END as policy_sql
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN (
    'user_profiles', 
    'albums', 
    'album_listens', 
    'album_ratings', 
    'diary_entries', 
    'user_follows', 
    'favorite_albums',
    'user_activities',
    'follow_requests'
  )
ORDER BY tablename, policyname;
```

**This will output CREATE POLICY statements for all your tables that you can copy and run in staging.**

## Method 2: Export Table Structure + Policies

**Run this for complete table recreation:**

```sql
-- Get table creation statements
SELECT 
    'CREATE TABLE ' || schemaname || '.' || tablename || ' (' ||
    string_agg(
        column_name || ' ' || data_type ||
        CASE 
            WHEN character_maximum_length IS NOT NULL 
            THEN '(' || character_maximum_length || ')'
            ELSE ''
        END ||
        CASE 
            WHEN is_nullable = 'NO' THEN ' NOT NULL'
            ELSE ''
        END,
        ', '
    ) || ');' as create_table_sql
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
  AND t.table_name IN ('favorite_albums', 'follow_requests')
GROUP BY schemaname, tablename;
```

## Method 3: Supabase Dashboard Export

**Alternative GUI approach:**

1. **Go to your PRODUCTION Supabase project**
2. **Database → Tables**
3. **Click each table** → **SQL** tab
4. **Copy the CREATE statements** and policies
5. **Run in staging**

## Method 4: Complete Database Clone (Easiest)

**If you want to clone everything:**

1. **Production Supabase** → **Settings** → **Database**
2. **Copy connection string**
3. **Use pg_dump to export**:
   ```bash
   pg_dump "postgresql://[connection-string]" --schema-only > production_schema.sql
   ```
4. **Run the exported schema** in staging

## Recommended Approach

**I recommend Method 1** - it gives you clean, readable policy statements that you can review before applying to staging.

**After running the export query, you'll get output like:**
```sql
CREATE POLICY "Users can view own listens" ON public.album_listens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own listens" ON public.album_listens FOR ALL USING (auth.uid() = user_id);
-- ... all your other policies
```

**Just copy and paste these into staging!** 

---

**Would you like me to help you run the export query, or do you prefer to handle this directly in your production dashboard?** 🎯