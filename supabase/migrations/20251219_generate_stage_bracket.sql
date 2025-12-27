-- RPC to generate a bracket for a specific stage
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
    v_advancement_count INTEGER;
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
    -- 1. Get stage details
    SELECT tournament_id, format, is_locked, advancement_count 
    INTO v_tournament_id, v_format, v_is_locked, v_advancement_count
    FROM tournament_stages
    WHERE id = p_stage_id;

    IF v_is_locked THEN
        RAISE EXCEPTION 'Stage is locked';
    END IF;

    -- 2. Check if matches already exist
    IF EXISTS (SELECT 1 FROM tournament_matches WHERE stage_id = p_stage_id) THEN
        RAISE EXCEPTION 'Bracket already generated for this stage';
    END IF;

    -- 3. Get enrolled teams
    SELECT array_agg(team_id) INTO v_teams
    FROM stage_participants
    WHERE stage_id = p_stage_id;

    v_team_count := array_length(v_teams, 1);
    IF v_team_count IS NULL OR v_team_count < 2 THEN
        RAISE EXCEPTION 'Not enough teams enrolled in this stage (minimum 2)';
    END IF;

    -- 4. Calculate bracket size (P)
    IF p_bracket_size IS NOT NULL THEN
        v_p := p_bracket_size;
    ELSE
        -- Next power of 2
        v_p := pow(2, ceil(log(2, v_team_count)))::INTEGER;
    END IF;

    v_num_rounds := log(2, v_p)::INTEGER;

    -- 5. Generate Matches (Single Elimination logic for now)
    
    -- Create matches round by round
    FOR v_round IN 1..v_num_rounds LOOP
        v_matches_in_round := v_p / pow(2, v_round);
        
        -- STOP if we have reached the advancement count
        -- If advancement_count is set (e.g. 8), and this round has fewer matches (e.g. 4),
        -- then the PREVIOUS round (with 8 matches) produced the 8 winners we need.
        -- So we don't need this round.
        IF v_advancement_count IS NOT NULL AND v_matches_in_round < v_advancement_count THEN
            IF v_round = 1 THEN
                RAISE EXCEPTION 'Advancement count (%) is too high for the number of teams (%). Cannot play elimination matches.', v_advancement_count, v_team_count;
            END IF;
            EXIT; -- Stop generating rounds
        END IF;

        FOR v_match_num IN 1..v_matches_in_round LOOP
            INSERT INTO tournament_matches (
                id,
                tournament_id,
                stage_id,
                round,
                match_number,
                status,
                bracket_side
            ) VALUES (
                gen_random_uuid(),
                v_tournament_id,
                p_stage_id,
                v_round,
                v_match_num,
                'pending',
                'winners'
            );
        END LOOP;
    END LOOP;

    -- Link matches (Winner advancement)
    -- We only link if the NEXT round exists
    FOR v_round IN 1..(v_num_rounds - 1) LOOP
        v_matches_in_round := v_p / pow(2, v_round);
        
        -- Check if next round exists (by checking if we stopped early)
        -- We can check if matches exist for round + 1
        IF NOT EXISTS (SELECT 1 FROM tournament_matches WHERE stage_id = p_stage_id AND round = v_round + 1) THEN
            EXIT; -- No next round to link to
        END IF;

        FOR v_match_num IN 1..v_matches_in_round LOOP
            v_next_pos := ceil(v_match_num::float / 2);
            
            SELECT id INTO v_match_id 
            FROM tournament_matches 
            WHERE stage_id = p_stage_id AND round = v_round AND match_number = v_match_num;
            
            SELECT id INTO v_next_match_id 
            FROM tournament_matches 
            WHERE stage_id = p_stage_id AND round = v_round + 1 AND match_number = v_next_pos;
            
            -- Only update if next match exists (it should, based on the check above)
            IF v_next_match_id IS NOT NULL THEN
                UPDATE tournament_matches SET next_match_id = v_next_match_id WHERE id = v_match_id;
            END IF;
        END LOOP;
    END LOOP;

    -- Initial Seeding (Round 1)
    FOR v_match_num IN 1..(v_p / 2) LOOP
        SELECT id INTO v_match_id 
        FROM tournament_matches 
        WHERE stage_id = p_stage_id AND round = 1 AND match_number = v_match_num;
        
        -- Seed team 1 (Top seed)
        IF v_match_num <= v_team_count THEN
            UPDATE tournament_matches SET team1_id = v_teams[v_match_num] WHERE id = v_match_id;
        END IF;
        
        -- Seed team 2 (Bottom seed)
        IF (v_p - v_match_num + 1) <= v_team_count THEN
            UPDATE tournament_matches SET team2_id = v_teams[v_p - v_match_num + 1] WHERE id = v_match_id;
        END IF;
    END LOOP;

END;
$$;
