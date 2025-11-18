-- Fix RLS Policies for Map Veto System
-- Allows team captains to update match_map_vetos when performing ban/pick actions
-- Also allows captains to insert into match_map_veto_actions

BEGIN;

-- Drop existing policies if they exist (to recreate with correct logic)
DO $$
BEGIN
    -- Drop match_map_vetos update policy
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'match_map_vetos' 
        AND policyname = 'match_map_vetos_modify_captain'
    ) THEN
        DROP POLICY match_map_vetos_modify_captain ON public.match_map_vetos;
        RAISE NOTICE 'Dropped existing match_map_vetos_modify_captain policy';
    END IF;
    
    -- Drop match_map_veto_actions insert policy if it exists with old name
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

-- Create improved UPDATE policy for match_map_vetos
-- Allows:
-- 1. Tournament organizers to update
-- 2. Team captains of team1_id OR team2_id to update (not just current_team_id)
-- 3. Service role to update
DO $$
BEGIN
    CREATE POLICY match_map_vetos_modify_captain ON public.match_map_vetos
    FOR UPDATE USING (
        -- Organizer can update
        EXISTS (
            SELECT 1 FROM public.tournaments t
            WHERE t.id = match_map_vetos.tournament_id 
            AND t.organizer_id = auth.uid()
        )
        OR
        -- Team captain of team1_id can update
        (
            match_map_vetos.team1_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM public.team_members tm
                WHERE tm.team_id = match_map_vetos.team1_id
                AND tm.user_id = auth.uid()
                AND tm.role = 'captain'
                AND tm.is_active = true
            )
        )
        OR
        -- Team captain of team2_id can update
        (
            match_map_vetos.team2_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM public.team_members tm
                WHERE tm.team_id = match_map_vetos.team2_id
                AND tm.user_id = auth.uid()
                AND tm.role = 'captain'
                AND tm.is_active = true
            )
        )
        OR auth.role() = 'service_role'
    ) WITH CHECK (
        -- Same conditions for WITH CHECK
        EXISTS (
            SELECT 1 FROM public.tournaments t
            WHERE t.id = match_map_vetos.tournament_id 
            AND t.organizer_id = auth.uid()
        )
        OR
        (
            match_map_vetos.team1_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM public.team_members tm
                WHERE tm.team_id = match_map_vetos.team1_id
                AND tm.user_id = auth.uid()
                AND tm.role = 'captain'
                AND tm.is_active = true
            )
        )
        OR
        (
            match_map_vetos.team2_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM public.team_members tm
                WHERE tm.team_id = match_map_vetos.team2_id
                AND tm.user_id = auth.uid()
                AND tm.role = 'captain'
                AND tm.is_active = true
            )
        )
        OR auth.role() = 'service_role'
    );
    RAISE NOTICE 'Created match_map_vetos_modify_captain policy';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Policy match_map_vetos_modify_captain already exists';
END $$;

-- Create improved INSERT policy for match_map_veto_actions
-- Allows:
-- 1. Tournament organizers to insert
-- 2. Team captains of the team_id specified in the action to insert
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
        -- Team captain of the team performing the action can insert
        (
            match_map_veto_actions.team_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM public.team_members tm
                WHERE tm.team_id = match_map_veto_actions.team_id
                AND tm.user_id = auth.uid()
                AND tm.role = 'captain'
                AND tm.is_active = true
            )
        )
        OR auth.role() = 'service_role'
    );
    RAISE NOTICE 'Created match_map_veto_actions_insert_captain policy';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Policy match_map_veto_actions_insert_captain already exists';
END $$;

-- Verify policies were created
DO $$
DECLARE
    veto_update_policy_count INTEGER;
    action_insert_policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO veto_update_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'match_map_vetos'
    AND policyname = 'match_map_vetos_modify_captain';
    
    SELECT COUNT(*) INTO action_insert_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'match_map_veto_actions'
    AND policyname = 'match_map_veto_actions_insert_captain';
    
    IF veto_update_policy_count = 1 AND action_insert_policy_count = 1 THEN
        RAISE NOTICE 'All RLS policies created successfully';
    ELSE
        RAISE WARNING 'Some policies may be missing. Veto update: %, Action insert: %', 
            veto_update_policy_count, action_insert_policy_count;
    END IF;
END $$;

COMMIT;

-- Note: After running this migration, captains should be able to:
-- 1. Update match_map_vetos when performing ban/pick actions
-- 2. Insert into match_map_veto_actions when performing actions
-- The policies now check team1_id and team2_id instead of just current_team_id

