-- =====================================================
-- FIX MATCH RESET RPCS AND ADD DELETE POLICIES (v2)
-- =====================================================
-- This migration updates the veto RPCs to use generic tables
-- and adds DELETE policies for match result related tables.
-- Corrected for schema: brkt_matches -> brkt_versions -> tournaments

BEGIN;

-- 1. UPDATE reset_match_veto TO USE GENERIC TABLES
CREATE OR REPLACE FUNCTION public.reset_match_veto(
  p_match_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_veto_id uuid;
BEGIN
  -- Find existing veto in the GENERIC table
  SELECT id INTO v_veto_id
  FROM public.match_map_vetos
  WHERE match_id = p_match_id;
  
  IF NOT FOUND THEN
    -- Fallback: If no veto found, just return silently
    RETURN;
  END IF;
  
  -- Delete all actions from the GENERIC table
  DELETE FROM public.match_map_veto_actions
  WHERE veto_id = v_veto_id;
  
  -- Reset veto state in the GENERIC table
  UPDATE public.match_map_vetos
  SET
    status = 'pending',
    current_team_id = team1_id, -- Reset to team1
    current_action = 'ban',
    current_action_number = 1,
    team1_banned_maps = '{}',
    team2_banned_maps = '{}',
    team1_picked_maps = '[]'::jsonb,
    team2_picked_maps = '[]'::jsonb,
    selected_map_id = null,
    -- best_of is NOT reset to null to preserve the series format
    turn_started_at = now(),
    started_at = now(),
    completed_at = null,
    updated_at = now()
  WHERE id = v_veto_id;
END;
$$;

-- 2. UPDATE initialize_match_veto TO USE GENERIC TABLES
CREATE OR REPLACE FUNCTION public.initialize_match_veto(
  p_match_id uuid,
  p_veto_format text default 'standard_7'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_veto_id uuid;
  v_match_record record;
BEGIN
  -- Get match details
  -- Try tournament_matches first
  SELECT tournament_id, team1_id, team2_id
  INTO v_match_record
  FROM public.tournament_matches
  WHERE id = p_match_id;
  
  IF NOT FOUND THEN
    -- Fallback to brkt_matches join
    SELECT v.tournament_id, m.team1_id, m.team2_id
    INTO v_match_record
    FROM public.brkt_matches m
    JOIN public.brkt_versions v ON m.version_id = v.id
    WHERE m.id = p_match_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Match not found in tournament_matches or brkt_matches';
    END IF;
  END IF;
  
  -- Check if veto already exists
  SELECT id INTO v_veto_id
  FROM public.match_map_vetos
  WHERE match_id = p_match_id;
  
  IF FOUND THEN
    -- Update tokens just in case
    UPDATE public.match_map_vetos
    SET
      team1_link_token = COALESCE(team1_link_token, encode(gen_random_bytes(16), 'hex')),
      team2_link_token = COALESCE(team2_link_token, encode(gen_random_bytes(16), 'hex'))
    WHERE id = v_veto_id;
    
    RETURN v_veto_id;
  END IF;
  
  INSERT INTO public.match_map_vetos (
    match_id,
    tournament_id,
    team1_id,
    team2_id,
    veto_format,
    status,
    current_team_id,
    current_action,
    current_action_number,
    turn_started_at,
    started_at,
    team1_link_token,
    team2_link_token,
    team1_picked_maps,
    team2_picked_maps
  ) VALUES (
    p_match_id,
    v_match_record.tournament_id,
    v_match_record.team1_id,
    v_match_record.team2_id,
    p_veto_format,
    'pending',
    v_match_record.team1_id,
    'ban',
    1,
    NOW(),
    NOW(),
    encode(gen_random_bytes(16), 'hex'),
    encode(gen_random_bytes(16), 'hex'),
    '[]'::jsonb,
    '[]'::jsonb
  )
  RETURNING id INTO v_veto_id;
  
  RETURN v_veto_id;
END;
$$;

-- 3. ADD DELETE POLICIES FOR ORGANIZERS

-- match_result_reports
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Organizers can delete reports' AND tablename = 'match_result_reports') THEN
    CREATE POLICY "Organizers can delete reports" ON public.match_result_reports
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.brkt_matches m
          JOIN public.brkt_versions v ON m.version_id = v.id
          JOIN public.tournaments t ON v.tournament_id = t.id
          WHERE m.id = match_result_reports.match_id
          AND (t.organizer_id = auth.uid() OR t.id IN (SELECT tournament_id FROM public.tournament_staff WHERE user_id = auth.uid()))
        )
      );
  END IF;
END $$;

-- tournament_disputes
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Organizers can delete disputes' AND tablename = 'tournament_disputes') THEN
    CREATE POLICY "Organizers can delete disputes" ON public.tournament_disputes
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.tournaments t
          WHERE t.id = tournament_disputes.tournament_id
          AND (t.organizer_id = auth.uid() OR t.id IN (SELECT tournament_id FROM public.tournament_staff WHERE user_id = auth.uid()))
        )
      );
  END IF;
END $$;

-- match_map_vetos
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Organizers can delete vetos' AND tablename = 'match_map_vetos') THEN
    CREATE POLICY "Organizers can delete vetos" ON public.match_map_vetos
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.tournaments t
          WHERE t.id = match_map_vetos.tournament_id
          AND (t.organizer_id = auth.uid() OR t.id IN (SELECT tournament_id FROM public.tournament_staff WHERE user_id = auth.uid()))
        )
      );
  END IF;
END $$;

-- match_map_veto_actions
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Organizers can delete veto actions' AND tablename = 'match_map_veto_actions') THEN
    CREATE POLICY "Organizers can delete veto actions" ON public.match_map_veto_actions
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.brkt_matches m
          JOIN public.brkt_versions v ON m.version_id = v.id
          JOIN public.tournaments t ON v.tournament_id = t.id
          WHERE m.id = match_map_veto_actions.match_id
          AND (t.organizer_id = auth.uid() OR t.id IN (SELECT tournament_id FROM public.tournament_staff WHERE user_id = auth.uid()))
        )
      );
  END IF;
END $$;

COMMIT;
