-- ============================================================================
-- STEP 2: CONSTRAINTS
-- ============================================================================

-- Primary Keys
SELECT 
    'ALTER TABLE ' || n.nspname || '.' || t.relname || 
    ' ADD CONSTRAINT ' || c.conname || 
    ' PRIMARY KEY (' || 
    string_agg(a.attname, ', ' ORDER BY array_position(c.conkey, a.attnum)) || 
    ');' as constraint_sql
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'p' AND n.nspname = 'public'
GROUP BY n.nspname, t.relname, c.conname, c.conkey
ORDER BY t.relname;