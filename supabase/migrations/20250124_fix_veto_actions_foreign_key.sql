-- =====================================================
-- FIX FOREIGN KEY CONSTRAINT FOR valorant_match_map_veto_actions
-- =====================================================
-- This migration ensures the foreign key constraint is properly set up
-- after the table rename

BEGIN;

-- Drop ALL possible foreign key constraint names
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Find all foreign key constraints on valorant_match_map_veto_actions that reference veto_id
    FOR r IN 
        SELECT conname, conrelid::regclass
        FROM pg_constraint
        WHERE conrelid = 'public.valorant_match_map_veto_actions'::regclass
        AND contype = 'f'
        AND confrelid = 'public.valorant_match_map_vetos'::regclass
    LOOP
        EXECUTE 'ALTER TABLE public.valorant_match_map_veto_actions DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;
    
    -- Also drop any constraints that might reference the old table name
    FOR r IN 
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.valorant_match_map_veto_actions'::regclass
        AND contype = 'f'
        AND conname LIKE '%match_map_veto%'
    LOOP
        EXECUTE 'ALTER TABLE public.valorant_match_map_veto_actions DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
        RAISE NOTICE 'Dropped old constraint: %', r.conname;
    END LOOP;
END $$;

-- Recreate the foreign key constraint with the correct reference
ALTER TABLE IF EXISTS public.valorant_match_map_veto_actions
  DROP CONSTRAINT IF EXISTS valorant_match_map_veto_actions_veto_id_fkey;

ALTER TABLE public.valorant_match_map_veto_actions
  ADD CONSTRAINT valorant_match_map_veto_actions_veto_id_fkey 
  FOREIGN KEY (veto_id) 
  REFERENCES public.valorant_match_map_vetos(id) 
  ON DELETE CASCADE;

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run this to verify the constraint:
-- SELECT 
--   conname AS constraint_name,
--   conrelid::regclass AS table_name,
--   confrelid::regclass AS referenced_table
-- FROM pg_constraint
-- WHERE conrelid = 'public.valorant_match_map_veto_actions'::regclass
-- AND contype = 'f';

