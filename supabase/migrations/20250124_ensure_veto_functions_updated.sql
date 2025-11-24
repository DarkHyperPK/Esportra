-- =====================================================
-- ENSURE VETO FUNCTIONS USE NEW TABLE NAMES
-- =====================================================
-- This migration ensures all functions are updated to use the new table names
-- Run this if you're getting "relation does not exist" errors

BEGIN;

-- =====================================================
-- 1. DROP OLD FUNCTIONS FIRST
-- =====================================================
-- Drop all versions of reset_match_veto
DROP FUNCTION IF EXISTS public.reset_match_veto(uuid);

-- Drop all versions of initialize_match_veto (drop by signature)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Find and drop all versions of initialize_match_veto
    FOR r IN 
        SELECT proname, oidvectortypes(proargtypes) as argtypes
        FROM pg_proc
        WHERE proname = 'initialize_match_veto'
        AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || '(' || r.argtypes || ') CASCADE';
        RAISE NOTICE 'Dropped function: %(%)', r.proname, r.argtypes;
    END LOOP;
END $$;

-- =====================================================
-- 2. CREATE reset_match_veto FUNCTION
-- =====================================================
CREATE FUNCTION public.reset_match_veto(
  p_match_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_veto_id uuid;
BEGIN
  -- Find existing veto in the NEW table
  SELECT id INTO v_veto_id
  FROM public.valorant_match_map_vetos
  WHERE match_id = p_match_id;
  
  IF NOT FOUND THEN
    -- Veto doesn't exist - that's okay, just return (don't raise exception)
    RETURN;
  END IF;
  
  -- Delete all actions from the NEW table
  DELETE FROM public.valorant_match_map_veto_actions
  WHERE veto_id = v_veto_id;
  
  -- Reset veto state in the NEW table
  UPDATE public.valorant_match_map_vetos
  SET
    status = 'pending',
    current_team_id = null,
    current_action = null,
    current_action_number = 0,
    team1_banned_maps = '{}',
    team2_banned_maps = '{}',
    team1_picked_maps = '{}',
    team2_picked_maps = '{}',
    selected_map_id = null,
    best_of = null,
    selected_map_pool = null,
    turn_started_at = null,
    started_at = null,
    completed_at = null,
    updated_at = now()
  WHERE id = v_veto_id;
END;
$$;

-- =====================================================
-- 3. CREATE initialize_match_veto FUNCTION
-- =====================================================
CREATE FUNCTION public.initialize_match_veto(
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
  v_team1_id uuid;
  v_team2_id uuid;
BEGIN
  -- Get match details
  SELECT tournament_id, team1_id, team2_id
  INTO v_match_record
  FROM public.tournament_matches
  WHERE id = p_match_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  
  -- Check if veto already exists in the NEW table
  SELECT id INTO v_veto_id
  FROM public.valorant_match_map_vetos
  WHERE match_id = p_match_id;
  
  IF FOUND THEN
    -- If veto exists but tokens are missing, generate them
    UPDATE public.valorant_match_map_vetos
    SET
      team1_link_token = COALESCE(team1_link_token, encode(gen_random_bytes(16), 'hex')),
      team2_link_token = COALESCE(team2_link_token, encode(gen_random_bytes(16), 'hex'))
    WHERE id = v_veto_id;
    
    RETURN v_veto_id; -- Return existing veto ID
  END IF;
  
  -- Determine starting team (higher seed or random)
  v_team1_id := v_match_record.team1_id;
  v_team2_id := v_match_record.team2_id;
  
  -- Generate unique link tokens for both teams
  -- Use gen_random_bytes with hex encoding for secure, unique tokens
  -- These tokens allow team captains to access the veto interface via shareable links
  
  -- Create new veto process in the NEW table
  INSERT INTO public.valorant_match_map_vetos (
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
    team2_link_token
  ) VALUES (
    p_match_id,
    v_match_record.tournament_id,
    v_team1_id,
    v_team2_id,
    p_veto_format,
    'pending', -- Start as pending until organizer sets BO format
    v_team1_id, -- Start with team1
    'ban', -- First action is always a ban
    1, -- First action
    NOW(),
    NOW(),
    encode(gen_random_bytes(16), 'hex'), -- Generate unique token for team 1
    encode(gen_random_bytes(16), 'hex')  -- Generate unique token for team 2
  )
  RETURNING id INTO v_veto_id;
  
  RETURN v_veto_id;
END;
$$;

-- =====================================================
-- 3. UPDATE COMMENTS
-- =====================================================
COMMENT ON FUNCTION public.reset_match_veto IS 'Reset a Valorant map veto process to allow starting over';
COMMENT ON FUNCTION public.initialize_match_veto IS 'Initialize a Valorant map veto process for a match';

COMMIT;

