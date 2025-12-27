-- Fix schema: Add selected_map_pool to match_map_vetos if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'match_map_vetos' AND column_name = 'selected_map_pool') THEN
        ALTER TABLE public.match_map_vetos ADD COLUMN selected_map_pool TEXT[];
    END IF;
END
$$;

-- Update initialize_match_veto to use generic tables
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
  v_game text;
BEGIN
  -- Get match details including stage_id and tournament game
  SELECT m.tournament_id, m.team1_id, m.team2_id, m.stage_id, s.config, t.game
  INTO v_match_record
  FROM public.tournament_matches m
  LEFT JOIN public.tournament_stages s ON m.stage_id = s.id
  LEFT JOIN public.tournaments t ON m.tournament_id = t.id
  WHERE m.id = p_match_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  
  -- Check if veto already exists
  SELECT id INTO v_veto_id
  FROM public.match_map_vetos
  WHERE match_id = p_match_id;
  
  IF FOUND THEN
    -- If veto exists but tokens are missing, generate them
    UPDATE public.match_map_vetos
    SET
      team1_link_token = COALESCE(team1_link_token, encode(gen_random_bytes(16), 'hex')),
      team2_link_token = COALESCE(team2_link_token, encode(gen_random_bytes(16), 'hex'))
    WHERE id = v_veto_id;
    
    RETURN v_veto_id; -- Return existing veto ID
  END IF;

  -- Determine Map Pool and Best Of from Stage Config
  IF v_match_record.config IS NOT NULL AND v_match_record.config ? 'veto' THEN
      v_stage_config := v_match_record.config->'veto';
      
      -- Check for custom map pool
      IF v_stage_config ? 'map_pool' AND jsonb_typeof(v_stage_config->'map_pool') = 'array' THEN
          SELECT array_agg(x) INTO v_map_pool_ids
          FROM jsonb_array_elements_text(v_stage_config->'map_pool') t(x);
      END IF;

      -- Check for tournament pool flag
      IF v_stage_config ? 'use_tournament_pool' AND (v_stage_config->>'use_tournament_pool')::boolean = true THEN
          v_use_tournament_pool := true;
          -- Fetch tournament pool maps
          SELECT array_agg(map_id) INTO v_map_pool_ids
          FROM tournament_map_pools
          WHERE tournament_id = v_match_record.tournament_id;
      END IF;

      -- Check for Best Of
      IF v_stage_config ? 'best_of' THEN
          -- Override default format based on Best Of
          DECLARE
              v_bo_val INTEGER;
          BEGIN
              v_bo_val := (v_stage_config->>'best_of')::INTEGER;
              IF v_bo_val IS NOT NULL THEN
                  IF v_bo_val = 1 THEN p_veto_format := 'bo1';
                  ELSIF v_bo_val = 3 THEN p_veto_format := 'bo3';
                  ELSIF v_bo_val = 5 THEN p_veto_format := 'bo5';
                  END IF;
                  -- Also update the best_of column value to be inserted
                  -- We'll use a new variable for this or just rely on the format logic?
                  -- Better to store it explicitly.
              END IF;
          END;
      END IF;
  END IF;
  
  -- Determine starting team
  v_team1_id := v_match_record.team1_id;
  v_team2_id := v_match_record.team2_id;
  
  -- Create new veto process in generic table
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
    selected_map_pool,
    best_of
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
    v_map_pool_ids,
    CASE 
        WHEN p_veto_format = 'bo1' THEN 1
        WHEN p_veto_format = 'bo3' THEN 3
        WHEN p_veto_format = 'bo5' THEN 5
        ELSE 1 
    END
  )
  RETURNING id INTO v_veto_id;
  
  RETURN v_veto_id;
END;
$$;
