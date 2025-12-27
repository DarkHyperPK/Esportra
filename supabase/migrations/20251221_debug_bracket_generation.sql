-- Enhanced Debug for Bracket Generation
-- This updates the function to give us detailed counts on why teams are missing.

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
    
    -- Debug variables
    v_debug_total INTEGER;
    v_debug_approved INTEGER;
    v_debug_with_team INTEGER;
    v_debug_approved_with_team INTEGER;
BEGIN
    SELECT tournament_id, format, is_locked INTO v_tournament_id, v_format, v_is_locked
    FROM tournament_stages
    WHERE id = p_stage_id;

    IF v_is_locked THEN RAISE EXCEPTION 'Stage is locked'; END IF;
    IF EXISTS (SELECT 1 FROM tournament_matches WHERE stage_id = p_stage_id) THEN
        RAISE EXCEPTION 'Bracket already generated for this stage';
    END IF;

    -- Auto-seed if empty
    SELECT array_agg(team_id ORDER BY random()) INTO v_teams FROM stage_participants WHERE stage_id = p_stage_id;
    v_team_count := array_length(v_teams, 1);

    IF v_team_count IS NULL OR v_team_count = 0 THEN
        PERFORM public.seed_stage_from_registrations(p_stage_id);
        SELECT array_agg(team_id ORDER BY random()) INTO v_teams FROM stage_participants WHERE stage_id = p_stage_id;
        v_team_count := array_length(v_teams, 1);
    END IF;

    IF v_team_count IS NULL OR v_team_count < 2 THEN
        -- GATHER DEBUG INFO
        SELECT count(*) INTO v_debug_total FROM tournament_participants WHERE tournament_id = v_tournament_id;
        SELECT count(*) INTO v_debug_approved FROM tournament_participants WHERE tournament_id = v_tournament_id AND status = 'approved';
        SELECT count(*) INTO v_debug_with_team FROM tournament_participants WHERE tournament_id = v_tournament_id AND team_id IS NOT NULL;
        SELECT count(*) INTO v_debug_approved_with_team FROM tournament_participants WHERE tournament_id = v_tournament_id AND status = 'approved' AND team_id IS NOT NULL;
        
        RAISE EXCEPTION 'Not enough teams (Min 2). Found: %. Debug: Total=%, Approved=%, WithTeam=%, Appr+Team=%', 
            COALESCE(v_team_count, 0), v_debug_total, v_debug_approved, v_debug_with_team, v_debug_approved_with_team;
    END IF;

    -- Calculate bracket size
    IF p_bracket_size IS NOT NULL THEN
        v_p := p_bracket_size;
    ELSE
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
    FOR v_match_num IN 1..(v_p / 2) LOOP
        SELECT id INTO v_match_id FROM tournament_matches WHERE stage_id = p_stage_id AND round = 1 AND match_number = v_match_num;
        IF v_match_num <= v_team_count THEN
            UPDATE tournament_matches SET team1_id = v_teams[v_match_num] WHERE id = v_match_id;
        END IF;
        IF (v_p - v_match_num + 1) <= v_team_count THEN
            UPDATE tournament_matches SET team2_id = v_teams[v_p - v_match_num + 1] WHERE id = v_match_id;
        END IF;
    END LOOP;
END;
$$;
