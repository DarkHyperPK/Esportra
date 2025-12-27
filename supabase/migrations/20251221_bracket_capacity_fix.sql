-- Update bracket generation to respect stage capacity
-- This ensures that if a stage has a capacity of 32, a bracket of 32 is generated even if only 4 teams are registered.

CREATE OR REPLACE FUNCTION public.generate_stage_bracket(
    p_stage_id UUID,
    p_bracket_size INTEGER DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_tournament_id UUID;
    v_format TEXT;
    v_is_locked BOOLEAN;
    v_capacity INTEGER;
    v_team_count INTEGER;
    v_teams UUID[];
    v_p INTEGER;
    v_num_rounds INTEGER;
    v_match_id UUID;
    v_next_match_id UUID;
    v_round INTEGER;
    v_match_num INTEGER;
    v_matches_in_round INTEGER;
    v_next_pos INTEGER;
BEGIN
    SELECT tournament_id, format, is_locked, capacity 
    INTO v_tournament_id, v_format, v_is_locked, v_capacity
    FROM tournament_stages WHERE id = p_stage_id;

    IF v_is_locked THEN RAISE EXCEPTION 'Stage is locked'; END IF;
    IF EXISTS (SELECT 1 FROM tournament_matches WHERE stage_id = p_stage_id) THEN
        RAISE EXCEPTION 'Bracket already generated for this stage';
    END IF;

    -- Initial check for teams
    SELECT array_agg(team_id ORDER BY random()) INTO v_teams FROM stage_participants WHERE stage_id = p_stage_id;
    v_team_count := array_length(v_teams, 1);

    -- Auto-seed if empty OR if not enough teams (retry logic)
    IF v_team_count IS NULL OR v_team_count < 2 THEN
        PERFORM public.seed_stage_from_registrations(p_stage_id);
        SELECT array_agg(team_id ORDER BY random()) INTO v_teams FROM stage_participants WHERE stage_id = p_stage_id;
        v_team_count := array_length(v_teams, 1);
    END IF;

    -- Allow generation even with 0 teams if a capacity is set (empty bracket)
    IF (v_team_count IS NULL OR v_team_count < 2) AND (v_capacity IS NULL OR v_capacity < 2) THEN
        RAISE EXCEPTION 'Not enough teams enrolled (Found: %) and no Capacity set. Minimum 2 teams or a valid Stage Capacity required.', COALESCE(v_team_count, 0);
    END IF;

    -- Calculate bracket size
    -- Priority: 1. Explicit Argument -> 2. Stage Capacity -> 3. Team Count
    IF p_bracket_size IS NOT NULL THEN
        v_p := p_bracket_size;
    ELSIF v_capacity IS NOT NULL AND v_capacity >= 2 THEN
        -- Round capacity up to nearest power of 2 (e.g. 30 -> 32)
        v_p := pow(2, ceil(log(2, v_capacity)))::INTEGER;
    ELSE
        v_p := pow(2, ceil(log(2, v_team_count)))::INTEGER;
    END IF;

    -- Ensure v_p is at least enough to hold the teams
    IF v_team_count > v_p THEN
         v_p := pow(2, ceil(log(2, v_team_count)))::INTEGER;
    END IF;

    v_num_rounds := log(2, v_p)::INTEGER;

    -- Generate Matches
    FOR v_round IN 1..v_num_rounds LOOP
        v_matches_in_round := v_p / pow(2, v_round);
        FOR v_match_num IN 1..v_matches_in_round LOOP
            INSERT INTO tournament_matches (id, tournament_id, stage_id, round, match_number, status, bracket_side) 
            VALUES (gen_random_uuid(), v_tournament_id, p_stage_id, v_round, v_match_num, 'pending', 'winners');
        END LOOP;
    END LOOP;

    -- Link Matches
    FOR v_round IN 1..(v_num_rounds - 1) LOOP
        v_matches_in_round := v_p / pow(2, v_round);
        FOR v_match_num IN 1..v_matches_in_round LOOP
            v_next_pos := ceil(v_match_num::float / 2);
            SELECT id INTO v_match_id FROM tournament_matches WHERE stage_id = p_stage_id AND round = v_round AND match_number = v_match_num;
            SELECT id INTO v_next_match_id FROM tournament_matches WHERE stage_id = p_stage_id AND round = v_round + 1 AND match_number = v_next_pos;
            UPDATE tournament_matches SET next_match_id = v_next_match_id WHERE id = v_match_id;
        END LOOP;
    END LOOP;

    -- Seed Round 1
    -- Only seed teams we actually have. The rest remain NULL (Byes/TBD).
    FOR v_match_num IN 1..(v_p / 2) LOOP
        SELECT id INTO v_match_id FROM tournament_matches WHERE stage_id = p_stage_id AND round = 1 AND match_number = v_match_num;
        
        -- Seed Team 1
        IF v_match_num <= v_team_count THEN
            UPDATE tournament_matches SET team1_id = v_teams[v_match_num] WHERE id = v_match_id;
        END IF;
        
        -- Seed Team 2
        IF (v_p - v_match_num + 1) <= v_team_count THEN
            UPDATE tournament_matches SET team2_id = v_teams[v_p - v_match_num + 1] WHERE id = v_match_id;
        END IF;
    END LOOP;
END;
$$;
