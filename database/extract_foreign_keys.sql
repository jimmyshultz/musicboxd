-- ============================================================================
-- STEP 3: FOREIGN KEYS
-- ============================================================================

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
    END || ';' as constraint_sql
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
JOIN pg_class ft ON c.confrelid = ft.oid
JOIN pg_namespace fn ON ft.relnamespace = fn.oid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
JOIN pg_attribute fa ON fa.attrelid = ft.oid AND fa.attnum = ANY(c.confkey)
WHERE c.contype = 'f' AND n.nspname = 'public'
GROUP BY n.nspname, t.relname, c.conname, c.conkey, c.confkey, fn.nspname, ft.relname, c.confdeltype
ORDER BY t.relname;