-- Simplified Bracket Generation Logic
-- Directly uses tournament_participants if stage is empty, avoiding complex seeding steps.

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
BEGIN
    -- 1. Get Stage Info
    SELECT tournament_id, format, is_locked INTO v_tournament_id, v_format, v_is_locked
    FROM tournament_stages
    WHERE id = p_stage_id;

    IF v_is_locked THEN RAISE EXCEPTION 'Stage is locked'; END IF;
    IF EXISTS (SELECT 1 FROM tournament_matches WHERE stage_id = p_stage_id) THEN
        RAISE EXCEPTION 'Bracket already generated for this stage';
    END IF;

    -- 2. Get Teams (Simplified Logic)
    -- First, check if teams are already in the stage (e.g. from previous stage advancement)
    SELECT array_agg(team_id ORDER BY random()) INTO v_teams 
    FROM stage_participants 
    WHERE stage_id = p_stage_id;
    
    v_team_count := array_length(v_teams, 1);

    -- If no teams in stage, this is likely the first stage.
    -- Pull directly from tournament registrations.
    IF v_team_count IS NULL OR v_team_count = 0 THEN
        SELECT array_agg(team_id ORDER BY random()) INTO v_teams 
        FROM tournament_participants 
        WHERE tournament_id = v_tournament_id 
        AND team_id IS NOT NULL
        AND (status = 'approved' OR status = 'checked_in'); -- Accept approved or checked_in
        
        v_team_count := array_length(v_teams, 1);
        
        -- Auto-enroll them into stage_participants for consistency
        IF v_team_count > 0 THEN
            INSERT INTO stage_participants (stage_id, team_id)
            SELECT p_stage_id, unnest(v_teams)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- 3. Validate Count
    IF v_team_count IS NULL OR v_team_count < 2 THEN
         RAISE EXCEPTION 'Not enough teams found. Need at least 2, found %. (Checked stage_participants and tournament_participants)', COALESCE(v_team_count, 0);
    END IF;

    -- 4. Calculate Bracket Size (Power of 2)
    IF p_bracket_size IS NOT NULL THEN
        v_p := p_bracket_size;
    ELSE
        v_p := pow(2, ceil(log(2, v_team_count)))::INTEGER;
    END IF;
    v_num_rounds := log(2, v_p)::INTEGER;

    -- 5. Generate Structure (Matches)
    FOR v_round IN 1..v_num_rounds LOOP
        v_matches_in_round := v_p / pow(2, v_round);
        FOR v_match_num IN 1..v_matches_in_round LOOP
            INSERT INTO tournament_matches (id, tournament_id, stage_id, round, match_number, status, bracket_side) 
            VALUES (gen_random_uuid(), v_tournament_id, p_stage_id, v_round, v_match_num, 'pending', 'winners');
        END LOOP;
    END LOOP;

    -- 6. Link Matches (Progression)
    FOR v_round IN 1..(v_num_rounds - 1) LOOP
        v_matches_in_round := v_p / pow(2, v_round);
        FOR v_match_num IN 1..v_matches_in_round LOOP
            v_next_pos := ceil(v_match_num::float / 2);
            SELECT id INTO v_match_id FROM tournament_matches WHERE stage_id = p_stage_id AND round = v_round AND match_number = v_match_num;
            SELECT id INTO v_next_match_id FROM tournament_matches WHERE stage_id = p_stage_id AND round = v_round + 1 AND match_number = v_next_pos;
            UPDATE tournament_matches SET next_match_id = v_next_match_id WHERE id = v_match_id;
        END LOOP;
    END LOOP;

    -- 7. Seed Teams into Round 1
    FOR v_match_num IN 1..(v_p / 2) LOOP
        SELECT id INTO v_match_id FROM tournament_matches WHERE stage_id = p_stage_id AND round = 1 AND match_number = v_match_num;
        -- Team 1
        IF v_match_num <= v_team_count THEN
            UPDATE tournament_matches SET team1_id = v_teams[v_match_num] WHERE id = v_match_id;
        END IF;
        -- Team 2
        IF (v_p - v_match_num + 1) <= v_team_count THEN
            UPDATE tournament_matches SET team2_id = v_teams[v_p - v_match_num + 1] WHERE id = v_match_id;
        END IF;
    END LOOP;
END;
$$;
