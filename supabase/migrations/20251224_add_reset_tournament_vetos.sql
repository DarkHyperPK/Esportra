-- Create a function to reset all map vetos for a tournament in one go
-- This replaces the slow client-side loop
CREATE OR REPLACE FUNCTION public.reset_tournament_vetos(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_veto_ids uuid[];
BEGIN
  -- Get all veto IDs for this tournament
  SELECT array_agg(id) INTO v_veto_ids
  FROM public.valorant_match_map_vetos
  WHERE tournament_id = p_tournament_id;

  IF v_veto_ids IS NULL THEN
    RETURN;
  END IF;

  -- Delete all actions for these vetos
  DELETE FROM public.valorant_match_map_veto_actions
  WHERE veto_id = ANY(v_veto_ids);

  -- Reset veto state
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
  WHERE id = ANY(v_veto_ids);
END;
$$;

COMMENT ON FUNCTION public.reset_tournament_vetos IS 'Reset all map vetos for a tournament to allow starting over (batch operation)';
