-- =====================================================
-- FIX RLS POLICIES FOR VALORANT MAP VETO TABLES
-- =====================================================
-- This migration fixes RLS policies to ensure they work correctly
-- after the table rename

BEGIN;

-- =====================================================
-- 1. FIX valorant_match_map_veto_actions INSERT POLICY
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS valorant_match_map_veto_actions_insert_captain ON public.valorant_match_map_veto_actions;
DROP POLICY IF EXISTS match_map_veto_actions_insert_captain ON public.valorant_match_map_veto_actions;

-- Create a more permissive INSERT policy that allows:
-- 1. Tournament organizers
-- 2. Team captains (for their team)
-- 3. Service role
CREATE POLICY valorant_match_map_veto_actions_insert_captain ON public.valorant_match_map_veto_actions
  FOR INSERT
  WITH CHECK (
    -- Tournament organizer can insert
    EXISTS (
      SELECT 1 
      FROM public.valorant_match_map_vetos mmv
      JOIN public.tournaments t ON t.id = mmv.tournament_id
      WHERE mmv.id = valorant_match_map_veto_actions.veto_id 
        AND t.organizer_id = auth.uid()
    )
    OR
    -- Team captain can insert for their team (check NEW row's team_id)
    (
      team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 
        FROM public.team_members tm
        WHERE tm.team_id = team_id
          AND tm.user_id = auth.uid()
          AND tm.role = 'captain'
          AND tm.is_active = true
      )
    )
    OR
    -- Service role can always insert
    auth.role() = 'service_role'
  );

-- =====================================================
-- 2. ENSURE valorant_match_map_vetos UPDATE POLICY WORKS
-- =====================================================

-- Drop and recreate the update policy to ensure it's correct
DROP POLICY IF EXISTS valorant_match_map_vetos_modify_captain ON public.valorant_match_map_vetos;
DROP POLICY IF EXISTS match_map_vetos_modify_captain ON public.valorant_match_map_vetos;

CREATE POLICY valorant_match_map_vetos_modify_captain ON public.valorant_match_map_vetos
  FOR UPDATE 
  USING (
    -- Tournament organizer can update
    EXISTS (
      SELECT 1 
      FROM public.tournaments t
      WHERE t.id = valorant_match_map_vetos.tournament_id 
        AND t.organizer_id = auth.uid()
    )
    OR
    -- Team captain can update when it's their turn (check current_team_id before update)
    (
      valorant_match_map_vetos.current_team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 
        FROM public.team_members tm
        WHERE tm.team_id = valorant_match_map_vetos.current_team_id
          AND tm.user_id = auth.uid()
          AND tm.role = 'captain'
          AND tm.is_active = true
      )
    )
    OR 
    auth.role() = 'service_role'
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK (check NEW row values)
    EXISTS (
      SELECT 1 
      FROM public.tournaments t
      WHERE t.id = valorant_match_map_vetos.tournament_id 
        AND t.organizer_id = auth.uid()
    )
    OR
    -- Allow captains of either team to update (check NEW row values)
    (
      (
        valorant_match_map_vetos.team1_id IS NOT NULL
        AND EXISTS (
          SELECT 1 
          FROM public.team_members tm
          WHERE tm.team_id = valorant_match_map_vetos.team1_id
            AND tm.user_id = auth.uid()
            AND tm.role = 'captain'
            AND tm.is_active = true
        )
      )
      OR
      (
        valorant_match_map_vetos.team2_id IS NOT NULL
        AND EXISTS (
          SELECT 1 
          FROM public.team_members tm
          WHERE tm.team_id = valorant_match_map_vetos.team2_id
            AND tm.user_id = auth.uid()
            AND tm.role = 'captain'
            AND tm.is_active = true
        )
      )
    )
    OR 
    auth.role() = 'service_role'
  );

COMMIT;

