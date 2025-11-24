-- Complete Database Export Script for Free Tier
-- Run this in your CURRENT project's SQL Editor
-- Copy the results and run in your BACKUP project

-- =====================================================
-- STEP 1: EXPORT ALL TABLE STRUCTURES
-- =====================================================
-- Copy all results from this query

SELECT 
  'CREATE TABLE IF NOT EXISTS ' || table_schema || '.' || table_name || ' (' ||
  string_agg(
    column_name || ' ' || 
    CASE 
      WHEN data_type = 'character varying' THEN 'VARCHAR(' || COALESCE(character_maximum_length::text, '') || ')'
      WHEN data_type = 'numeric' THEN 'NUMERIC(' || numeric_precision || ',' || numeric_scale || ')'
      WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
      WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
      WHEN data_type = 'uuid' THEN 'UUID'
      WHEN data_type = 'jsonb' THEN 'JSONB'
      WHEN data_type = 'text' THEN 'TEXT'
      WHEN data_type = 'integer' THEN 'INTEGER'
      WHEN data_type = 'bigint' THEN 'BIGINT'
      WHEN data_type = 'boolean' THEN 'BOOLEAN'
      WHEN data_type = 'double precision' THEN 'DOUBLE PRECISION'
      WHEN data_type = 'real' THEN 'REAL'
      WHEN data_type = 'smallint' THEN 'SMALLINT'
      WHEN data_type = 'date' THEN 'DATE'
      WHEN data_type = 'time' THEN 'TIME'
      ELSE UPPER(data_type)
    END ||
    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
    CASE 
      WHEN column_default IS NOT NULL AND column_default NOT LIKE 'nextval%' 
        THEN ' DEFAULT ' || column_default
      WHEN column_default LIKE 'nextval%' 
        THEN ' DEFAULT ' || column_default
      ELSE ''
    END,
    ', ' ORDER BY ordinal_position
  ) || 
  ');' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name NOT LIKE 'pg_%'
  AND table_name NOT LIKE '_prisma%'
GROUP BY table_schema, table_name
ORDER BY table_name;

-- =====================================================
-- STEP 2: EXPORT ALL RLS POLICIES
-- =====================================================
-- Copy all results from this query

SELECT 
  'CREATE POLICY IF NOT EXISTS "' || policyname || '" ON ' || schemaname || '.' || tablename ||
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
-- STEP 3: EXPORT ALL INDEXES
-- =====================================================
-- Copy all results from this query

SELECT 
  'CREATE INDEX IF NOT EXISTS ' || indexname || 
  ' ON ' || schemaname || '.' || tablename ||
  CASE 
    WHEN indexdef LIKE '%USING%' THEN ' ' || substring(indexdef from 'USING.*')
    ELSE ''
  END || ';' as index_statement
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT LIKE 'pg_%'
ORDER BY tablename, indexname;

-- =====================================================
-- STEP 4: LIST ALL TABLES (for reference)
-- =====================================================

SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = t.table_name) as column_count,
  (SELECT COUNT(*) FROM information_schema.table_constraints 
   WHERE table_schema = 'public' AND table_name = t.table_name) as constraint_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- =====================================================
-- STEP 5: EXPORT DATA (Run separately for each table)
-- =====================================================
-- Replace 'your_table_name' with actual table name
-- Run this for EACH table you want to export data from

-- Example for profiles table:
/*
SELECT 
  'INSERT INTO profiles (id, username, full_name, email, created_at) VALUES ' ||
  string_agg(
    '(' ||
    COALESCE('''' || id::text || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(username, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(full_name, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(email, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || created_at::text || '''', 'NULL') ||
    ')',
    ', '
  ) || ';' as insert_statement
FROM profiles;
*/

-- =====================================================
-- STEP 6: EXPORT FOREIGN KEY CONSTRAINTS
-- =====================================================

SELECT 
  'ALTER TABLE ' || tc.table_schema || '.' || tc.table_name ||
  ' ADD CONSTRAINT ' || tc.constraint_name ||
  ' FOREIGN KEY (' || string_agg(kcu.column_name, ', ') || ')' ||
  ' REFERENCES ' || ccu.table_schema || '.' || ccu.table_name ||
  ' (' || string_agg(ccu.column_name, ', ') || ')' ||
  CASE 
    WHEN rc.delete_rule != 'NO ACTION' THEN ' ON DELETE ' || rc.delete_rule
    ELSE ''
  END ||
  CASE 
    WHEN rc.update_rule != 'NO ACTION' THEN ' ON UPDATE ' || rc.update_rule
    ELSE ''
  END || ';' as fk_statement
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc 
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
GROUP BY tc.table_schema, tc.table_name, tc.constraint_name, 
         ccu.table_schema, ccu.table_name, rc.delete_rule, rc.update_rule
ORDER BY tc.table_name, tc.constraint_name;

