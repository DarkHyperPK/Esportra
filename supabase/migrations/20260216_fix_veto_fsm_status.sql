-- =====================================================
-- FIX MAP VETO FSM STATUS AND RPC LOGIC
-- =====================================================
-- This migration fixes the INVALID_STATE error by ensuring
-- vetos are correctly marked as 'in_progress' when active.
-- It also clears team/action data on reset to force re-initialization.

BEGIN;

-- 1. FIX EXISTING DATA
-- Any veto that is 'pending' but has a current_team_id and current_action 
-- should be 'in_progress' to avoid INVALID_STATE in the FSM.
UPDATE public.match_map_vetos
SET status = 'in_progress'
WHERE status = 'pending' 
AND current_team_id IS NOT NULL 
AND current_action IS NOT NULL;

-- 2. IMPROVE initialize_match_veto
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
  v_best_of integer;
BEGIN
  -- Derive best_of from format
  v_best_of := CASE 
    WHEN p_veto_format ILIKE '%bo1%' THEN 1
    WHEN p_veto_format ILIKE '%bo3%' THEN 3
    WHEN p_veto_format ILIKE '%bo5%' THEN 5
    WHEN p_veto_format = 'standard_7' THEN 1
    ELSE 1
  END;

  -- Get match details
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
      RAISE EXCEPTION 'Match not found';
    END IF;
  END IF;
  
  -- Check existing
  SELECT id INTO v_veto_id
  FROM public.match_map_vetos
  WHERE match_id = p_match_id;
  
  IF FOUND THEN
    -- Update tokens and best_of just in case
    UPDATE public.match_map_vetos
    SET
      team1_link_token = COALESCE(team1_link_token, encode(gen_random_bytes(16), 'hex')),
      team2_link_token = COALESCE(team2_link_token, encode(gen_random_bytes(16), 'hex')),
      best_of = COALESCE(best_of, v_best_of)
    WHERE id = v_veto_id;
    
    RETURN v_veto_id;
  END IF;
  
  INSERT INTO public.match_map_vetos (
    match_id,
    tournament_id,
    team1_id,
    team2_id,
    veto_format,
    best_of,
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
    v_best_of,
    'in_progress', -- Start as in_progress if we have a default best_of
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

-- 3. IMPROVE reset_match_veto
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
    RETURN;
  END IF;
  
  -- Delete all actions from the GENERIC table
  DELETE FROM public.match_map_veto_actions
  WHERE veto_id = v_veto_id;
  
  -- Reset veto state in the GENERIC table
  -- We set status to pending and CLEAR current data to force a fresh selection
  UPDATE public.match_map_vetos
  SET
    status = 'pending',
    current_team_id = NULL,
    current_action = NULL,
    current_action_number = 1,
    team1_banned_maps = '{}',
    team2_banned_maps = '{}',
    team1_picked_maps = '[]'::jsonb,
    team2_picked_maps = '[]'::jsonb,
    selected_map_id = null,
    best_of = NULL, -- Force re-selection of Best Of
    turn_started_at = NULL,
    started_at = NULL,
    completed_at = null,
    updated_at = now()
  WHERE id = v_veto_id;
END;
$$;

COMMIT;
