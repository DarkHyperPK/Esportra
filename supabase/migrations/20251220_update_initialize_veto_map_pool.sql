-- Migration to update initialize_match_veto to respect stage-specific map pools
-- This ensures that when a match is initialized, it checks the stage config for a custom map pool

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
  v_team1_id uuid;
  v_team2_id uuid;
  v_stage_config jsonb;
  v_map_pool_ids text[] DEFAULT null;
  v_use_tournament_pool boolean DEFAULT false;
BEGIN
  -- Get match details including stage_id
  SELECT m.tournament_id, m.team1_id, m.team2_id, m.stage_id, s.config
  INTO v_match_record
  FROM public.tournament_matches m
  LEFT JOIN public.tournament_stages s ON m.stage_id = s.id
  WHERE m.id = p_match_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  
  -- Check if veto already exists
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

  -- Determine Map Pool from Stage Config
  IF v_match_record.config IS NOT NULL AND v_match_record.config ? 'veto' THEN
      v_stage_config := v_match_record.config->'veto';
      
      -- Check for custom map pool
      IF v_stage_config ? 'map_pool' AND jsonb_typeof(v_stage_config->'map_pool') = 'array' THEN
          SELECT array_agg(x) INTO v_map_pool_ids
          FROM jsonb_array_elements_text(v_stage_config->'map_pool') t(x);
      END IF;

      -- Check for tournament pool flag (legacy support or explicit flag)
      IF v_stage_config ? 'use_tournament_pool' AND (v_stage_config->>'use_tournament_pool')::boolean = true THEN
          v_use_tournament_pool := true;
          -- If using tournament pool, we can fetch those IDs here or let the frontend handle it.
          -- For consistency, let's fetch them if we can, but the frontend logic in MapVeto.tsx 
          -- handles "tournament pool" by checking the map_pools table if selected_map_pool is null.
          -- However, if we want to be explicit, we could populate it here.
          -- For now, if use_tournament_pool is true, we leave v_map_pool_ids as null 
          -- so the system falls back to the tournament pool or all maps.
          -- BUT, to support "Custom Pool", we MUST save the IDs if they exist.
      END IF;
  END IF;
  
  -- Determine starting team (higher seed or random)
  v_team1_id := v_match_record.team1_id;
  v_team2_id := v_match_record.team2_id;
  
  -- Create new veto process
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
    team2_link_token,
    selected_map_pool -- Insert the custom map pool if it exists
  ) VALUES (
    p_match_id,
    v_match_record.tournament_id,
    v_team1_id,
    v_team2_id,
    p_veto_format,
    'pending',
    v_team1_id,
    'ban',
    1,
    NOW(),
    NOW(),
    encode(gen_random_bytes(16), 'hex'),
    encode(gen_random_bytes(16), 'hex'),
    v_map_pool_ids -- This will be null if not set, or an array of UUIDs
  )
  RETURNING id INTO v_veto_id;
  
  RETURN v_veto_id;
END;
$$;
