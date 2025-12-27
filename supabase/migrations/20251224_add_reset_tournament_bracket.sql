-- Create a comprehensive function to reset the entire bracket in one transaction
-- This combines resetting matches, clearing results, and resetting vetos
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

    -- Reset veto state
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
      -- Note: best_of is NOT reset here; it will be auto-updated by the UI when format changes
      turn_started_at = null,
      started_at = null,
      completed_at = null,
      updated_at = now()
    WHERE id = ANY(v_veto_ids);
  END IF;

  -- 3. Reset Round 1 matches (keep teams/seeds)
  UPDATE public.tournament_matches
  SET
    status = 'pending',
    team1_score = null,
    team2_score = null,
    winner_team_id = null,
    party_code = null,
    updated_at = now()
  WHERE tournament_id = p_tournament_id AND round = 1;

  -- 4. Reset Round > 1 matches (clear teams too)
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
  WHERE tournament_id = p_tournament_id AND round > 1;

END;
$$;

COMMENT ON FUNCTION public.reset_tournament_bracket IS 'Completely resets a tournament bracket (results, vetos, matches) in a single transaction';
