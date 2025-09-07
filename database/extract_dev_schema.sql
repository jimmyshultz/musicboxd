-- ============================================================================
-- RESONARE PRODUCTION SCHEMA EXTRACTION
-- Run this query on your DEV database to extract the complete schema
-- ============================================================================

-- This will generate a complete schema dump including:
-- 1. All table structures with constraints
-- 2. All indexes
-- 3. All functions and triggers
-- 4. All RLS policies
-- 5. All permissions

-- ============================================================================
-- EXTRACT TABLE DEFINITIONS
-- ============================================================================

SELECT 'CREATE TABLE ' || schemaname || '.' || tablename || ' (' || chr(10) ||
    string_agg(
        '    ' || column_name || ' ' || data_type || 
        CASE 
            WHEN character_maximum_length IS NOT NULL 
            THEN '(' || character_maximum_length || ')'
            WHEN numeric_precision IS NOT NULL AND numeric_scale IS NOT NULL
            THEN '(' || numeric_precision || ',' || numeric_scale || ')'
            WHEN numeric_precision IS NOT NULL
            THEN '(' || numeric_precision || ')'
            ELSE ''
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
        ',' || chr(10)
    ) || chr(10) || ');' || chr(10) || chr(10) as table_ddl
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND t.table_name IN (
        'user_profiles', 'albums', 'album_listens', 'album_ratings', 
        'diary_entries', 'user_follows', 'favorite_albums', 'user_activities',
        'follow_requests'
    )
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ============================================================================
-- EXTRACT PRIMARY KEYS AND UNIQUE CONSTRAINTS
-- ============================================================================

SELECT 'ALTER TABLE ' || schemaname || '.' || tablename || 
       ' ADD CONSTRAINT ' || conname || 
       ' PRIMARY KEY (' || 
       string_agg(attname, ', ' ORDER BY attnum) || ');' || chr(10) as pk_ddl
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'p'
    AND n.nspname = 'public'
    AND t.relname IN (
        'user_profiles', 'albums', 'album_listens', 'album_ratings', 
        'diary_entries', 'user_follows', 'favorite_albums', 'user_activities',
        'follow_requests'
    )
GROUP BY schemaname, tablename, conname
ORDER BY tablename;

-- ============================================================================
-- EXTRACT FOREIGN KEY CONSTRAINTS
-- ============================================================================

SELECT 'ALTER TABLE ' || n.nspname || '.' || t.relname || 
       ' ADD CONSTRAINT ' || c.conname || 
       ' FOREIGN KEY (' || string_agg(a.attname, ', ' ORDER BY a.attnum) || ')' ||
       ' REFERENCES ' || fn.nspname || '.' || ft.relname || 
       ' (' || string_agg(fa.attname, ', ' ORDER BY fa.attnum) || ')' ||
       CASE WHEN c.confdeltype = 'c' THEN ' ON DELETE CASCADE'
            WHEN c.confdeltype = 'r' THEN ' ON DELETE RESTRICT'
            WHEN c.confdeltype = 's' THEN ' ON DELETE SET NULL'
            WHEN c.confdeltype = 'd' THEN ' ON DELETE SET DEFAULT'
            ELSE ''
       END || ';' || chr(10) as fk_ddl
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
JOIN pg_class ft ON c.confrelid = ft.oid
JOIN pg_namespace fn ON ft.relnamespace = fn.oid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
JOIN pg_attribute fa ON fa.attrelid = ft.oid AND fa.attnum = ANY(c.confkey)
WHERE c.contype = 'f'
    AND n.nspname = 'public'
    AND t.relname IN (
        'user_profiles', 'albums', 'album_listens', 'album_ratings', 
        'diary_entries', 'user_follows', 'favorite_albums', 'user_activities',
        'follow_requests'
    )
GROUP BY n.nspname, t.relname, c.conname, fn.nspname, ft.relname, c.confdeltype
ORDER BY t.relname;

-- ============================================================================
-- EXTRACT CHECK CONSTRAINTS
-- ============================================================================

SELECT 'ALTER TABLE ' || n.nspname || '.' || t.relname || 
       ' ADD CONSTRAINT ' || c.conname || 
       ' CHECK ' || c.consrc || ';' || chr(10) as check_ddl
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE c.contype = 'c'
    AND n.nspname = 'public'
    AND t.relname IN (
        'user_profiles', 'albums', 'album_listens', 'album_ratings', 
        'diary_entries', 'user_follows', 'favorite_albums', 'user_activities',
        'follow_requests'
    )
ORDER BY t.relname, c.conname;

-- ============================================================================
-- EXTRACT UNIQUE CONSTRAINTS
-- ============================================================================

SELECT 'ALTER TABLE ' || n.nspname || '.' || t.relname || 
       ' ADD CONSTRAINT ' || c.conname || 
       ' UNIQUE (' || string_agg(a.attname, ', ' ORDER BY a.attnum) || ');' || chr(10) as unique_ddl
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'u'
    AND n.nspname = 'public'
    AND t.relname IN (
        'user_profiles', 'albums', 'album_listens', 'album_ratings', 
        'diary_entries', 'user_follows', 'favorite_albums', 'user_activities',
        'follow_requests'
    )
GROUP BY n.nspname, t.relname, c.conname
ORDER BY t.relname;

-- ============================================================================
-- EXTRACT INDEXES
-- ============================================================================

SELECT 'CREATE ' || 
       CASE WHEN i.indisunique THEN 'UNIQUE ' ELSE '' END ||
       'INDEX ' || c.relname || ' ON ' || n.nspname || '.' || t.relname || 
       ' (' || string_agg(a.attname, ', ' ORDER BY a.attnum) || ');' || chr(10) as index_ddl
FROM pg_index i
JOIN pg_class c ON i.indexrelid = c.oid
JOIN pg_class t ON i.indrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(i.indkey)
WHERE n.nspname = 'public'
    AND t.relname IN (
        'user_profiles', 'albums', 'album_listens', 'album_ratings', 
        'diary_entries', 'user_follows', 'favorite_albums', 'user_activities',
        'follow_requests'
    )
    AND NOT i.indisprimary  -- Exclude primary key indexes
GROUP BY c.relname, n.nspname, t.relname, i.indisunique
ORDER BY t.relname, c.relname;

-- ============================================================================
-- EXTRACT FUNCTIONS
-- ============================================================================

SELECT 'CREATE OR REPLACE FUNCTION ' || n.nspname || '.' || p.proname || 
       '(' || pg_get_function_arguments(p.oid) || ')' || chr(10) ||
       'RETURNS ' || pg_get_function_result(p.oid) || chr(10) ||
       'AS $' || '$' || chr(10) ||
       p.prosrc || chr(10) ||
       '$' || '$ LANGUAGE ' || l.lanname || 
       CASE WHEN p.prosecdef THEN ' SECURITY DEFINER' ELSE '' END ||
       ';' || chr(10) || chr(10) as function_ddl
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_language l ON p.prolang = l.oid
WHERE n.nspname = 'public'
    AND p.proname IN ('update_updated_at_column', 'create_activity_feed_entry', 'handle_new_user')
ORDER BY p.proname;

-- ============================================================================
-- EXTRACT TRIGGERS
-- ============================================================================

SELECT 'CREATE TRIGGER ' || t.tgname || chr(10) ||
       '    ' || 
       CASE t.tgtype & 2 
           WHEN 0 THEN 'AFTER'
           ELSE 'BEFORE'
       END || ' ' ||
       CASE t.tgtype & 28
           WHEN 4 THEN 'INSERT'
           WHEN 8 THEN 'DELETE'
           WHEN 16 THEN 'UPDATE'
           WHEN 12 THEN 'INSERT OR DELETE'
           WHEN 20 THEN 'INSERT OR UPDATE'
           WHEN 24 THEN 'DELETE OR UPDATE'
           WHEN 28 THEN 'INSERT OR DELETE OR UPDATE'
       END || ' ON ' || n.nspname || '.' || c.relname || chr(10) ||
       '    FOR EACH ROW EXECUTE FUNCTION ' || 
       pn.nspname || '.' || p.proname || 
       '(' || array_to_string(t.tgargs, ', ') || ');' || chr(10) || chr(10) as trigger_ddl
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace pn ON p.pronamespace = pn.oid
WHERE NOT t.tgisinternal
    AND n.nspname = 'public'
    AND c.relname IN (
        'user_profiles', 'albums', 'album_listens', 'album_ratings', 
        'diary_entries', 'user_follows', 'favorite_albums', 'user_activities',
        'follow_requests'
    )
ORDER BY c.relname, t.tgname;

-- ============================================================================
-- EXTRACT RLS POLICIES
-- ============================================================================

SELECT 'CREATE POLICY "' || pol.polname || '" ON ' || n.nspname || '.' || c.relname || chr(10) ||
       '    FOR ' || 
       CASE pol.polcmd
           WHEN 'r' THEN 'SELECT'
           WHEN 'a' THEN 'INSERT'
           WHEN 'w' THEN 'UPDATE'
           WHEN 'd' THEN 'DELETE'
           WHEN '*' THEN 'ALL'
       END || 
       CASE 
           WHEN pol.polwithcheck IS NOT NULL THEN ' WITH CHECK (' || pol.polwithcheck || ')'
           WHEN pol.polqual IS NOT NULL THEN ' USING (' || pol.polqual || ')'
           ELSE ''
       END || ';' || chr(10) || chr(10) as policy_ddl
FROM pg_policy pol
JOIN pg_class c ON pol.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
    AND c.relname IN (
        'user_profiles', 'albums', 'album_listens', 'album_ratings', 
        'diary_entries', 'user_follows', 'favorite_albums', 'user_activities',
        'follow_requests'
    )
ORDER BY c.relname, pol.polname;

-- ============================================================================
-- EXTRACT RLS ENABLE STATUS
-- ============================================================================

SELECT 'ALTER TABLE ' || n.nspname || '.' || c.relname || 
       ' ENABLE ROW LEVEL SECURITY;' || chr(10) as rls_ddl
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relrowsecurity = true
    AND n.nspname = 'public'
    AND c.relname IN (
        'user_profiles', 'albums', 'album_listens', 'album_ratings', 
        'diary_entries', 'user_follows', 'favorite_albums', 'user_activities',
        'follow_requests'
    )
ORDER BY c.relname;

-- ============================================================================
-- EXTRACT PERMISSIONS
-- ============================================================================

SELECT 'GRANT ' || privilege_type || ' ON ' || table_schema || '.' || table_name || 
       ' TO ' || grantee || ';' || chr(10) as grant_ddl
FROM information_schema.table_privileges
WHERE table_schema = 'public'
    AND table_name IN (
        'user_profiles', 'albums', 'album_listens', 'album_ratings', 
        'diary_entries', 'user_follows', 'favorite_albums', 'user_activities',
        'follow_requests'
    )
    AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;

-- ============================================================================
-- ADDITIONAL GRANTS FOR SCHEMA AND SEQUENCES
-- ============================================================================

SELECT 'GRANT USAGE ON SCHEMA public TO anon, authenticated;' || chr(10) ||
       'GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;' || chr(10) ||
       'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;' || chr(10) as schema_grants;