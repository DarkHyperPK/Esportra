-- Simple Database Export Script
-- Run this in your current Supabase project's SQL Editor
-- Copy the results and run them in your backup project

-- =====================================================
-- 1. EXPORT ALL TABLE STRUCTURES
-- =====================================================

SELECT 
  'CREATE TABLE IF NOT EXISTS ' || table_schema || '.' || table_name || ' (' ||
  string_agg(
    column_name || ' ' || 
    CASE 
      WHEN data_type = 'character varying' THEN 'VARCHAR(' || COALESCE(character_maximum_length::text, '') || ')'
      WHEN data_type = 'numeric' THEN 'NUMERIC(' || numeric_precision || ',' || numeric_scale || ')'
      WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
      WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
      WHEN data_type = 'double precision' THEN 'DOUBLE PRECISION'
      WHEN data_type = 'boolean' THEN 'BOOLEAN'
      WHEN data_type = 'uuid' THEN 'UUID'
      WHEN data_type = 'jsonb' THEN 'JSONB'
      WHEN data_type = 'text' THEN 'TEXT'
      WHEN data_type = 'integer' THEN 'INTEGER'
      WHEN data_type = 'bigint' THEN 'BIGINT'
      ELSE UPPER(data_type)
    END ||
    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
    CASE 
      WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default
      ELSE ''
    END,
    ', '
    ORDER BY ordinal_position
  ) || ');' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name NOT LIKE 'pg_%'
GROUP BY table_schema, table_name
ORDER BY table_name;

-- =====================================================
-- 2. EXPORT ALL RLS POLICIES
-- =====================================================

SELECT 
  'CREATE POLICY "' || policyname || '" ON ' || schemaname || '.' || tablename ||
  ' FOR ' || cmd || 
  CASE 
    WHEN qual IS NOT NULL THEN ' USING (' || qual || ')'
    ELSE ''
  END ||
  CASE 
    WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')'
    ELSE ''
  END || ';' as policy_statement
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- 3. EXPORT ALL INDEXES
-- =====================================================

SELECT 
  'CREATE INDEX IF NOT EXISTS ' || indexname || 
  ' ON ' || schemaname || '.' || tablename ||
  ' USING ' || indexdef || ';' as index_statement
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- =====================================================
-- 4. EXPORT DATA (Run for each table separately)
-- =====================================================

-- Example for one table (repeat for each table):
-- COPY (SELECT * FROM your_table_name) TO STDOUT WITH CSV HEADER;

-- Or generate INSERT statements:
/*
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
  LOOP
    RAISE NOTICE 'Exporting data from: %', r.table_name;
    -- You'll need to manually export each table's data
  END LOOP;
END $$;
*/

-- =====================================================
-- 5. LIST ALL TABLES (for reference)
-- =====================================================

SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

