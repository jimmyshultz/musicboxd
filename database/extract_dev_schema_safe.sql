-- ============================================================================
-- EXTRACT COMPLETE SCHEMA FROM DEV DATABASE
-- Run this on your DEV database to get the exact production schema
-- ============================================================================

-- This will generate the complete DDL to recreate your database exactly
-- Copy the output and run it on your production database

-- ============================================================================
-- PART 1: TABLE STRUCTURES
-- ============================================================================

-- Get all table creation statements
SELECT 
    'CREATE TABLE ' || t.table_schema || '.' || t.table_name || ' (' || chr(10) ||
    string_agg(
        '    ' || c.column_name || ' ' || 
        -- Handle data types properly
        CASE 
            WHEN c.data_type = 'character varying' THEN 'TEXT'
            WHEN c.data_type = 'character' THEN 'CHAR(' || c.character_maximum_length || ')'
            WHEN c.data_type = 'text' THEN 'TEXT'
            WHEN c.data_type = 'integer' THEN 'INTEGER'
            WHEN c.data_type = 'bigint' THEN 'BIGINT'
            WHEN c.data_type = 'uuid' THEN 'UUID'
            WHEN c.data_type = 'boolean' THEN 'BOOLEAN'
            WHEN c.data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
            WHEN c.data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
            WHEN c.data_type = 'date' THEN 'DATE'
            WHEN c.data_type = 'ARRAY' THEN c.udt_name
            ELSE upper(c.data_type)
        END ||
        -- Add NOT NULL constraint
        CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        -- Add DEFAULT values
        CASE 
            WHEN c.column_default IS NOT NULL THEN ' DEFAULT ' || c.column_default
            ELSE ''
        END,
        ',' || chr(10) ORDER BY c.ordinal_position
    ) || chr(10) || ');' || chr(10) || chr(10) as create_table_sql
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE '%_pkey'
GROUP BY t.table_schema, t.table_name
ORDER BY t.table_name;

-- ============================================================================
-- PART 2: CONSTRAINTS
-- ============================================================================

-- Primary Keys
SELECT 
    'ALTER TABLE ' || n.nspname || '.' || t.relname || 
    ' ADD CONSTRAINT ' || c.conname || 
    ' PRIMARY KEY (' || 
    string_agg(a.attname, ', ' ORDER BY array_position(c.conkey, a.attnum)) || 
    ');' || chr(10) as constraint_sql
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'p' AND n.nspname = 'public'
GROUP BY n.nspname, t.relname, c.conname, c.conkey
ORDER BY t.relname;

-- Foreign Keys
SELECT 
    'ALTER TABLE ' || n.nspname || '.' || t.relname || 
    ' ADD CONSTRAINT ' || c.conname || 
    ' FOREIGN KEY (' || 
    string_agg(a.attname, ', ' ORDER BY array_position(c.conkey, a.attnum)) || 
    ') REFERENCES ' || fn.nspname || '.' || ft.relname || 
    ' (' || 
    string_agg(fa.attname, ', ' ORDER BY array_position(c.confkey, fa.attnum)) || 
    ')' ||
    CASE c.confdeltype 
        WHEN 'c' THEN ' ON DELETE CASCADE'
        WHEN 'r' THEN ' ON DELETE RESTRICT'
        WHEN 'n' THEN ' ON DELETE SET NULL'
        WHEN 'd' THEN ' ON DELETE SET DEFAULT'
        ELSE ''
    END ||
    CASE c.confupdtype 
        WHEN 'c' THEN ' ON UPDATE CASCADE'
        WHEN 'r' THEN ' ON UPDATE RESTRICT'
        WHEN 'n' THEN ' ON UPDATE SET NULL'
        WHEN 'd' THEN ' ON UPDATE SET DEFAULT'
        ELSE ''
    END || ';' || chr(10) as constraint_sql
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
JOIN pg_class ft ON c.confrelid = ft.oid
JOIN pg_namespace fn ON ft.relnamespace = fn.oid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
JOIN pg_attribute fa ON fa.attrelid = ft.oid AND fa.attnum = ANY(c.confkey)
WHERE c.contype = 'f' AND n.nspname = 'public'
GROUP BY n.nspname, t.relname, c.conname, c.conkey, c.confkey, fn.nspname, ft.relname, c.confdeltype, c.confupdtype
ORDER BY t.relname;

-- Check Constraints
SELECT 
    'ALTER TABLE ' || n.nspname || '.' || t.relname || 
    ' ADD CONSTRAINT ' || c.conname || 
    ' CHECK ' || pg_get_constraintdef(c.oid) || ';' || chr(10) as constraint_sql
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE c.contype = 'c' AND n.nspname = 'public'
ORDER BY t.relname, c.conname;

-- Unique Constraints
SELECT 
    'ALTER TABLE ' || n.nspname || '.' || t.relname || 
    ' ADD CONSTRAINT ' || c.conname || 
    ' UNIQUE (' || 
    string_agg(a.attname, ', ' ORDER BY array_position(c.conkey, a.attnum)) || 
    ');' || chr(10) as constraint_sql
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'u' AND n.nspname = 'public'
GROUP BY n.nspname, t.relname, c.conname, c.conkey
ORDER BY t.relname;

-- ============================================================================
-- PART 3: INDEXES
-- ============================================================================

SELECT 
    pg_get_indexdef(i.indexrelid) || ';' || chr(10) as index_sql
FROM pg_index i
JOIN pg_class c ON i.indexrelid = c.oid
JOIN pg_class t ON i.indrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE n.nspname = 'public' 
    AND NOT i.indisprimary 
    AND NOT i.indisunique
ORDER BY t.relname, c.relname;

-- ============================================================================
-- PART 4: FUNCTIONS
-- ============================================================================

SELECT 
    pg_get_functiondef(p.oid) || ';' || chr(10) || chr(10) as function_sql
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- ============================================================================
-- PART 5: TRIGGERS
-- ============================================================================

SELECT 
    'CREATE TRIGGER ' || t.tgname || chr(10) ||
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
    pn.nspname || '.' || p.proname || '(' ||
    CASE 
        WHEN t.tgargs IS NOT NULL THEN 
            array_to_string(
                ARRAY(
                    SELECT quote_literal(arg) 
                    FROM unnest(string_to_array(encode(t.tgargs, 'escape'), E'\\000')) AS arg
                    WHERE arg != ''
                ), ', '
            )
        ELSE ''
    END || ');' || chr(10) || chr(10) as trigger_sql
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace pn ON p.pronamespace = pn.oid
WHERE NOT t.tgisinternal AND n.nspname = 'public'
ORDER BY c.relname, t.tgname;

-- ============================================================================
-- PART 6: ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS statements
SELECT 
    'ALTER TABLE ' || n.nspname || '.' || c.relname || 
    ' ENABLE ROW LEVEL SECURITY;' || chr(10) as rls_enable_sql
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
ORDER BY c.relname;

-- RLS Policies
SELECT 
    'CREATE POLICY ' || quote_ident(pol.polname) || ' ON ' || 
    n.nspname || '.' || c.relname || chr(10) ||
    '    FOR ' || 
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END ||
    CASE 
        WHEN pol.polqual IS NOT NULL AND pol.polwithcheck IS NOT NULL THEN
            ' USING (' || pol.polqual || ')' || chr(10) ||
            '    WITH CHECK (' || pol.polwithcheck || ')'
        WHEN pol.polqual IS NOT NULL THEN
            ' USING (' || pol.polqual || ')'
        WHEN pol.polwithcheck IS NOT NULL THEN
            ' WITH CHECK (' || pol.polwithcheck || ')'
        ELSE ''
    END || ';' || chr(10) || chr(10) as policy_sql
FROM pg_policy pol
JOIN pg_class c ON pol.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY c.relname, pol.polname;

-- ============================================================================
-- PART 7: PERMISSIONS
-- ============================================================================

SELECT 'GRANT USAGE ON SCHEMA public TO anon, authenticated;' || chr(10) ||
       'GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;' || chr(10) ||
       'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;' || chr(10) as permissions_sql;