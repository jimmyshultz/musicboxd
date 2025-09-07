-- ============================================================================
-- STEP-BY-STEP SCHEMA EXTRACTION
-- Run each section separately and copy the results
-- ============================================================================

-- ============================================================================
-- STEP 1: TABLE STRUCTURES
-- ============================================================================

SELECT 
    'CREATE TABLE ' || t.table_schema || '.' || t.table_name || ' (' || chr(10) ||
    string_agg(
        '    ' || c.column_name || ' ' || 
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
        CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE 
            WHEN c.column_default IS NOT NULL THEN ' DEFAULT ' || c.column_default
            ELSE ''
        END,
        ',' || chr(10) ORDER BY c.ordinal_position
    ) || chr(10) || ');' || chr(10) as create_table_sql
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
GROUP BY t.table_schema, t.table_name
ORDER BY t.table_name;