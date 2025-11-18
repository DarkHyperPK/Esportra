-- Fix RLS Policy for match_map_veto_actions
-- Allows captains of EITHER team1_id OR team2_id in the veto to insert actions
-- This is necessary for side selection where the opposite team picks the side

BEGIN;

-- Drop existing policy if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'match_map_veto_actions' 
        AND policyname = 'match_map_veto_actions_insert_captain'
    ) THEN
        DROP POLICY match_map_veto_actions_insert_captain ON public.match_map_veto_actions;
        RAISE NOTICE 'Dropped existing match_map_veto_actions_insert_captain policy';
    END IF;
END $$;

-- Create improved INSERT policy for match_map_veto_actions
-- Allows:
-- 1. Tournament organizers to insert
-- 2. Team captains of team1_id OR team2_id in the veto (not just the action's team_id)
-- 3. Service role to insert
DO $$
BEGIN
    CREATE POLICY match_map_veto_actions_insert_captain ON public.match_map_veto_actions
    FOR INSERT WITH CHECK (
        -- Organizer can insert
        EXISTS (
            SELECT 1 FROM public.match_map_vetos mmv
            JOIN public.tournaments t ON t.id = mmv.tournament_id
            WHERE mmv.id = match_map_veto_actions.veto_id
            AND t.organizer_id = auth.uid()
        )
        OR
        -- Team captain of team1_id in the veto can insert (for any action)
        EXISTS (
            SELECT 1 FROM public.match_map_vetos mmv
            WHERE mmv.id = match_map_veto_actions.veto_id
            AND mmv.team1_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.team_members tm
                WHERE tm.team_id = mmv.team1_id
                AND tm.user_id = auth.uid()
                AND tm.role = 'captain'
                AND tm.is_active = true
            )
        )
        OR
        -- Team captain of team2_id in the veto can insert (for any action)
        EXISTS (
            SELECT 1 FROM public.match_map_vetos mmv
            WHERE mmv.id = match_map_veto_actions.veto_id
            AND mmv.team2_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.team_members tm
                WHERE tm.team_id = mmv.team2_id
                AND tm.user_id = auth.uid()
                AND tm.role = 'captain'
                AND tm.is_active = true
            )
        )
        OR auth.role() = 'service_role'
    );
    RAISE NOTICE 'Created improved match_map_veto_actions_insert_captain policy';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Policy match_map_veto_actions_insert_captain already exists';
END $$;

COMMIT;

