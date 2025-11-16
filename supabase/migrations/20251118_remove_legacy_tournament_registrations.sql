-- =====================================================
-- REMOVE LEGACY TOURNAMENT_REGISTRATIONS TABLE
-- =====================================================
-- This migration removes the unused legacy tournament_registrations table.
-- The active table for tournament registrations is tournament_participants.
--
-- Note: This table was created in early migrations but was never actively used.
-- All tournament registrations are stored in tournament_participants.

-- First, drop any dependent objects (indexes, constraints, etc.)
DROP INDEX IF EXISTS public.idx_tournament_registrations_tournament_id;
DROP INDEX IF EXISTS public.idx_tournament_registrations_user_id;
DROP INDEX IF EXISTS public.idx_tournament_registrations_team_id;
DROP INDEX IF EXISTS public.idx_tournament_registrations_status;
DROP INDEX IF EXISTS public.idx_tournament_registrations_created_at;

-- Drop any RLS policies on the table
DO $$
BEGIN
    -- Drop all policies on tournament_registrations
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournament_registrations') THEN
        DROP POLICY IF EXISTS tournament_registrations_select_policy ON public.tournament_registrations;
        DROP POLICY IF EXISTS tournament_registrations_insert_policy ON public.tournament_registrations;
        DROP POLICY IF EXISTS tournament_registrations_update_policy ON public.tournament_registrations;
        DROP POLICY IF EXISTS tournament_registrations_delete_policy ON public.tournament_registrations;
    END IF;
END $$;

-- Finally, drop the table itself
DROP TABLE IF EXISTS public.tournament_registrations CASCADE;

-- Add a comment to document this cleanup
COMMENT ON SCHEMA public IS 'Legacy tournament_registrations table removed - use tournament_participants instead';

