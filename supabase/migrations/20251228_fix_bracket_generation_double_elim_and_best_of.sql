-- Fix Bracket Generation for Double Elimination and Best Of
-- This migration updates generate_stage_bracket to:
-- 1. Support 'double_elimination' format by generating Losers Bracket and Grand Finals.
-- 2. Apply 'bestOf' setting from stage config to all generated matches.

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
    v_config JSONB;
    v_best_of INTEGER := 1;
    v_team_count INTEGER;
    v_teams UUID[];
    v_p INTEGER;
    v_num_rounds INTEGER; -- Upper Bracket Rounds
    v_num_lower_rounds INTEGER;
    v_match_id UUID;
    v_next_match_id UUID;
    v_loser_next_match_id UUID;
    v_round INTEGER;
    v_match_num INTEGER;
    v_matches_in_round INTEGER;
    v_next_pos INTEGER;
    v_gf_id UUID;
    v_upper_final_id UUID;
    v_lower_final_id UUID;
    v_lr INTEGER; -- Lower Round index
BEGIN
    -- 1. Get Stage Info
    SELECT tournament_id, format, is_locked, config INTO v_tournament_id, v_format, v_is_locked, v_config
    FROM tournament_stages
    WHERE id = p_stage_id;

    IF v_is_locked THEN RAISE EXCEPTION 'Stage is locked'; END IF;
    IF EXISTS (SELECT 1 FROM tournament_matches WHERE stage_id = p_stage_id) THEN
        RAISE EXCEPTION 'Bracket already generated for this stage';
    END IF;

    -- Extract Best Of from config
    IF v_config IS NOT NULL AND v_config ? 'bestOf' THEN
        v_best_of := (v_config->>'bestOf')::INTEGER;
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

    ---------------------------------------------------------------------------
    -- GENERATE MATCHES
    ---------------------------------------------------------------------------

    -- A. Upper Bracket (Winners) - Generated for both Single and Double Elim
    FOR v_round IN 1..v_num_rounds LOOP
        v_matches_in_round := v_p / pow(2, v_round);
        FOR v_match_num IN 1..v_matches_in_round LOOP
            INSERT INTO tournament_matches (id, tournament_id, stage_id, round, match_number, status, bracket_side, best_of) 
            VALUES (gen_random_uuid(), v_tournament_id, p_stage_id, v_round, v_match_num, 'pending', 'winners', v_best_of);
        END LOOP;
    END LOOP;

    -- B. Lower Bracket (Losers) - Only for Double Elim
    IF v_format = 'double_elimination' THEN
        v_num_lower_rounds := 2 * v_num_rounds - 2;
        
        FOR v_round IN 1..v_num_lower_rounds LOOP
            -- Calculate matches in this lower round
            -- R1, R2: P/4 matches
            -- R3, R4: P/8 matches
            -- Formula: 2 ^ floor((num_lower_rounds - 1 - (round-1)) / 2)
            -- Simplified: matches = 2 ^ floor((v_num_lower_rounds - v_round) / 2)
            v_matches_in_round := pow(2, floor((v_num_lower_rounds - v_round) / 2))::INTEGER;
            
            FOR v_match_num IN 1..v_matches_in_round LOOP
                INSERT INTO tournament_matches (id, tournament_id, stage_id, round, match_number, status, bracket_side, best_of) 
                VALUES (gen_random_uuid(), v_tournament_id, p_stage_id, v_round, v_match_num, 'pending', 'losers', v_best_of);
            END LOOP;
        END LOOP;

        -- C. Grand Finals
        -- Round is v_num_rounds + 1 (relative to Upper Bracket count)
        v_gf_id := gen_random_uuid();
        INSERT INTO tournament_matches (id, tournament_id, stage_id, round, match_number, status, bracket_side, best_of) 
        VALUES (v_gf_id, v_tournament_id, p_stage_id, v_num_rounds + 1, 1, 'pending', 'final', v_best_of);
    END IF;

    ---------------------------------------------------------------------------
    -- LINK MATCHES
    ---------------------------------------------------------------------------

    -- A. Link Upper Bracket
    FOR v_round IN 1..(v_num_rounds - 1) LOOP
        v_matches_in_round := v_p / pow(2, v_round);
        FOR v_match_num IN 1..v_matches_in_round LOOP
            v_next_pos := ceil(v_match_num::float / 2);
            
            -- Get current match ID
            SELECT id INTO v_match_id FROM tournament_matches 
            WHERE stage_id = p_stage_id AND round = v_round AND match_number = v_match_num AND bracket_side = 'winners';
            
            -- Get next match ID (Winner)
            SELECT id INTO v_next_match_id FROM tournament_matches 
            WHERE stage_id = p_stage_id AND round = v_round + 1 AND match_number = v_next_pos AND bracket_side = 'winners';
            
            -- Update Winner Link
            UPDATE tournament_matches SET next_match_id = v_next_match_id WHERE id = v_match_id;

            -- Double Elim: Link Loser to Lower Bracket
            IF v_format = 'double_elimination' THEN
                -- Loser drop logic:
                -- WB Round 1 -> LB Round 1 (index 1)
                -- WB Round 2 -> LB Round 2 (index 2)
                -- WB Round 3 -> LB Round 4 (index 4)
                -- WB Round 4 -> LB Round 6 (index 6)
                -- Formula: If round = 1 then 1 else (round - 1) * 2 end? No.
                -- Let's check standard mapping:
                -- R1 losers -> L R1
                -- R2 losers -> L R2
                -- R3 losers -> L R4
                -- R4 losers -> L R6
                -- General: WB Round R -> LB Round (2*R - 2) ? No.
                -- R1: 1 -> 1. (2*1 - 2 = 0, no)
                -- R2: 2 -> 2. (2*2 - 2 = 2, yes)
                -- R3: 3 -> 4. (2*3 - 2 = 4, yes)
                -- R4: 4 -> 6. (2*4 - 2 = 6, yes)
                -- So for R > 1, it's 2*R - 2. For R=1, it's 1.
                
                IF v_round = 1 THEN
                    v_lr := 1;
                ELSE
                    v_lr := (2 * v_round) - 2;
                END IF;

                -- Check if this lower round exists
                IF v_lr <= v_num_lower_rounds THEN
                    -- Calculate position in lower round
                    -- For R1: WB Match 1,2 -> LB Match 1. WB Match 3,4 -> LB Match 2.
                    -- Position is ceil(match_num / 2)
                    
                    -- Wait, standard drop mapping is:
                    -- WB R1 losers drop to LB R1. 
                    -- WB R1 has P/2 matches. LB R1 has P/4 matches.
                    -- So 2 WB losers feed into 1 LB match.
                    -- Pos = ceil(match_num / 2).
                    
                    -- WB R2 losers drop to LB R2.
                    -- WB R2 has P/4 matches. LB R2 has P/4 matches.
                    -- So 1 WB loser feeds into 1 LB match.
                    -- Pos = match_num.
                    
                    -- WB R3 losers drop to LB R4.
                    -- WB R3 has P/8 matches. LB R4 has P/8 matches.
                    -- Pos = match_num.
                    
                    IF v_round = 1 THEN
                        v_next_pos := ceil(v_match_num::float / 2);
                    ELSE
                        v_next_pos := v_match_num;
                    END IF;

                    SELECT id INTO v_loser_next_match_id FROM tournament_matches 
                    WHERE stage_id = p_stage_id AND round = v_lr AND match_number = v_next_pos AND bracket_side = 'losers';
                    
                    UPDATE tournament_matches SET loser_next_match_id = v_loser_next_match_id WHERE id = v_match_id;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    -- B. Link Lower Bracket (Double Elim)
    IF v_format = 'double_elimination' THEN
        FOR v_round IN 1..(v_num_lower_rounds - 1) LOOP
            -- Matches in this round
            v_matches_in_round := pow(2, floor((v_num_lower_rounds - v_round) / 2))::INTEGER;
            
            FOR v_match_num IN 1..v_matches_in_round LOOP
                -- Advancement logic:
                -- If round is odd (1, 3, 5...): Contracting round. 2 matches -> 1 match.
                -- Next pos = ceil(match_num / 2).
                -- If round is even (2, 4, 6...): Feeding round. 1 match -> 1 match.
                -- Next pos = match_num.
                
                IF v_round % 2 != 0 THEN
                     v_next_pos := ceil(v_match_num::float / 2);
                ELSE
                     v_next_pos := v_match_num;
                END IF;

                SELECT id INTO v_match_id FROM tournament_matches 
                WHERE stage_id = p_stage_id AND round = v_round AND match_number = v_match_num AND bracket_side = 'losers';
                
                SELECT id INTO v_next_match_id FROM tournament_matches 
                WHERE stage_id = p_stage_id AND round = v_round + 1 AND match_number = v_next_pos AND bracket_side = 'losers';
                
                UPDATE tournament_matches SET next_match_id = v_next_match_id WHERE id = v_match_id;
            END LOOP;
        END LOOP;
        
        -- C. Link Finals
        -- Upper Bracket Final (Winner -> GF, Loser -> Lower Bracket Final)
        SELECT id INTO v_upper_final_id FROM tournament_matches 
        WHERE stage_id = p_stage_id AND round = v_num_rounds AND match_number = 1 AND bracket_side = 'winners';
        
        -- Lower Bracket Final (Winner -> GF)
        SELECT id INTO v_lower_final_id FROM tournament_matches 
        WHERE stage_id = p_stage_id AND round = v_num_lower_rounds AND match_number = 1 AND bracket_side = 'losers';
        
        -- Grand Final ID already generated as v_gf_id
        
        -- Link Upper Final
        IF v_upper_final_id IS NOT NULL THEN
            UPDATE tournament_matches 
            SET next_match_id = v_gf_id, loser_next_match_id = v_lower_final_id 
            WHERE id = v_upper_final_id;
        END IF;
        
        -- Link Lower Final
        IF v_lower_final_id IS NOT NULL THEN
            UPDATE tournament_matches 
            SET next_match_id = v_gf_id 
            WHERE id = v_lower_final_id;
        END IF;
    END IF;

    ---------------------------------------------------------------------------
    -- SEED TEAMS (Round 1)
    ---------------------------------------------------------------------------
    FOR v_match_num IN 1..(v_p / 2) LOOP
        SELECT id INTO v_match_id FROM tournament_matches 
        WHERE stage_id = p_stage_id AND round = 1 AND match_number = v_match_num AND bracket_side = 'winners';
        
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
