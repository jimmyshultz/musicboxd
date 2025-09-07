-- ============================================================================
-- STEP 6: TRIGGERS
-- ============================================================================

SELECT 
    'CREATE TRIGGER ' || t.tgname ||
    ' ' || 
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
    END || ' ON ' || n.nspname || '.' || c.relname ||
    ' FOR EACH ROW EXECUTE FUNCTION ' || 
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
    END || ');' as trigger_sql
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace pn ON p.pronamespace = pn.oid
WHERE NOT t.tgisinternal AND n.nspname = 'public'
ORDER BY c.relname, t.tgname;

-- ============================================================================
-- STEP 7: ENABLE RLS
-- ============================================================================

SELECT 
    'ALTER TABLE ' || n.nspname || '.' || c.relname || 
    ' ENABLE ROW LEVEL SECURITY;' as rls_enable_sql
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
ORDER BY c.relname;

-- ============================================================================
-- STEP 8: RLS POLICIES
-- ============================================================================

SELECT 
    'CREATE POLICY ' || quote_ident(pol.polname) || ' ON ' || 
    n.nspname || '.' || c.relname ||
    ' FOR ' || 
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END ||
    CASE 
        WHEN pol.polqual IS NOT NULL AND pol.polwithcheck IS NOT NULL THEN
            ' USING (' || pg_get_expr(pol.polqual, pol.polrelid) || ')' ||
            ' WITH CHECK (' || pg_get_expr(pol.polwithcheck, pol.polrelid) || ')'
        WHEN pol.polqual IS NOT NULL THEN
            ' USING (' || pg_get_expr(pol.polqual, pol.polrelid) || ')'
        WHEN pol.polwithcheck IS NOT NULL THEN
            ' WITH CHECK (' || pg_get_expr(pol.polwithcheck, pol.polrelid) || ')'
        ELSE ''
    END || ';' as policy_sql
FROM pg_policy pol
JOIN pg_class c ON pol.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY c.relname, pol.polname;