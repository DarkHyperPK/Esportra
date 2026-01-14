-- Fix: Correctly reset bracket by distinguishing between seeded matches (WB R1) and dependent matches (LB R1)

CREATE OR REPLACE FUNCTION public.reset_tournament_bracket(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_veto_ids uuid[];
BEGIN
  -- 1. Delete match results
  DELETE FROM public.tournament_match_results
  WHERE tournament_id = p_tournament_id;

  -- 2. Reset Vetos (logic from reset_tournament_vetos)
  -- Get all veto IDs for this tournament
  SELECT array_agg(id) INTO v_veto_ids
  FROM public.match_map_vetos
  WHERE tournament_id = p_tournament_id;

  IF v_veto_ids IS NOT NULL THEN
    -- Delete all actions for these vetos
    DELETE FROM public.match_map_veto_actions
    WHERE veto_id = ANY(v_veto_ids);

    -- Reset veto state (NOTE: best_of is NOT reset - it will be auto-updated by the UI)
    UPDATE public.match_map_vetos
    SET
      status = 'pending',
      current_team_id = null,
      current_action = null,
      current_action_number = 0,
      team1_banned_maps = '{}',
      team2_banned_maps = '{}',
      team1_picked_maps = '[]',
      team2_picked_maps = '[]',
      selected_map_id = null,
      -- best_of is intentionally NOT reset here
      turn_started_at = null,
      started_at = null,
      completed_at = null,
      updated_at = now()
    WHERE id = ANY(v_veto_ids);
  END IF;

  -- 3. Reset Seeded Matches (Winners Bracket Round 1) - KEEP TEAMS
  -- We identify these by round=1 AND (bracket_side='winners' OR bracket_side IS NULL)
  UPDATE public.tournament_matches
  SET
    status = 'pending',
    team1_score = null,
    team2_score = null,
    winner_team_id = null,
    party_code = null,
    updated_at = now()
  WHERE tournament_id = p_tournament_id 
    AND round = 1 
    AND (bracket_side = 'winners' OR bracket_side IS NULL);

  -- 4. Reset Dependent Matches (Lower Bracket Round 1, and ALL other rounds) - CLEAR TEAMS
  -- This includes:
  -- - Round 1 of Losers Bracket
  -- - Round > 1 of Winners Bracket
  -- - Round > 1 of Losers Bracket
  -- - Finals, Reset, etc.
  UPDATE public.tournament_matches
  SET
    status = 'pending',
    team1_score = null,
    team2_score = null,
    winner_team_id = null,
    team1_id = null,
    team2_id = null,
    party_code = null,
    updated_at = now()
  WHERE tournament_id = p_tournament_id 
    AND NOT (round = 1 AND (bracket_side = 'winners' OR bracket_side IS NULL));

END;
$$;

COMMENT ON FUNCTION public.reset_tournament_bracket IS 'Completely resets a tournament bracket. Preserves teams ONLY for Winners Bracket Round 1. Clears teams for Lower Bracket Round 1 and all other matches.';
