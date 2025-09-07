-- ============================================================================
-- STEP 4: INDEXES
-- ============================================================================

SELECT 
    pg_get_indexdef(i.indexrelid) || ';' as index_sql
FROM pg_index i
JOIN pg_class c ON i.indexrelid = c.oid
JOIN pg_class t ON i.indrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE n.nspname = 'public' 
    AND NOT i.indisprimary 
    AND NOT i.indisunique
ORDER BY t.relname, c.relname;

-- ============================================================================
-- STEP 5: FUNCTIONS
-- ============================================================================

SELECT 
    pg_get_functiondef(p.oid) || ';' as function_sql
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;