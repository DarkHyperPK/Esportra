-- Fix: Update generate_stage_bracket to NOT insert into best_of column (which was dropped)
-- Best of is now derived from tournament_stages.config.bestOf at runtime

CREATE OR REPLACE FUNCTION public.generate_stage_bracket(p_stage_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tournament_id UUID;
    v_stage_id UUID := p_stage_id;
    v_format TEXT;
    v_capacity INTEGER;
    v_num_rounds INTEGER;
    v_num_matches INTEGER;
    v_round INTEGER;
    v_match_num INTEGER;
    v_lb_rounds INTEGER;
    v_gf_id UUID;
    v_config JSONB;
BEGIN
    -- Get stage info
    SELECT tournament_id, format, capacity, config
    INTO v_tournament_id, v_format, v_capacity, v_config
    FROM tournament_stages
    WHERE id = p_stage_id;

    IF v_tournament_id IS NULL THEN
        RAISE EXCEPTION 'Stage not found: %', p_stage_id;
    END IF;

    -- Default format if not specified
    IF v_format IS NULL OR v_format = '' THEN
        v_format := 'single_elimination';
    END IF;

    -- Calculate number of rounds (log2 of capacity)
    v_num_rounds := CEIL(LOG(2, GREATEST(v_capacity, 2)));

    -- Delete existing matches for this stage
    DELETE FROM tournament_matches WHERE stage_id = p_stage_id;

    -- Generate bracket based on format
    IF v_format = 'single_elimination' THEN
        -- Single elimination: generate matches for each round
        FOR v_round IN 1..v_num_rounds LOOP
            v_num_matches := POWER(2, v_num_rounds - v_round)::INTEGER;
            FOR v_match_num IN 1..v_num_matches LOOP
                INSERT INTO tournament_matches (id, tournament_id, stage_id, round, match_number, status, bracket_side) 
                VALUES (gen_random_uuid(), v_tournament_id, p_stage_id, v_round, v_match_num, 'pending', 'winners');
            END LOOP;
        END LOOP;
        
    ELSIF v_format = 'double_elimination' THEN
        -- Winners bracket
        FOR v_round IN 1..v_num_rounds LOOP
            v_num_matches := POWER(2, v_num_rounds - v_round)::INTEGER;
            FOR v_match_num IN 1..v_num_matches LOOP
                INSERT INTO tournament_matches (id, tournament_id, stage_id, round, match_number, status, bracket_side) 
                VALUES (gen_random_uuid(), v_tournament_id, p_stage_id, v_round, v_match_num, 'pending', 'winners');
            END LOOP;
        END LOOP;
        
        -- Losers bracket (2 * (num_rounds - 1) rounds)
        v_lb_rounds := 2 * (v_num_rounds - 1);
        FOR v_round IN 1..v_lb_rounds LOOP
            -- Losers bracket has fewer matches per round
            IF v_round % 2 = 1 THEN
                v_num_matches := POWER(2, v_num_rounds - CEIL(v_round::FLOAT / 2) - 1)::INTEGER;
            ELSE
                v_num_matches := POWER(2, v_num_rounds - (v_round / 2) - 1)::INTEGER;
            END IF;
            v_num_matches := GREATEST(v_num_matches, 1);
            
            FOR v_match_num IN 1..v_num_matches LOOP
                INSERT INTO tournament_matches (id, tournament_id, stage_id, round, match_number, status, bracket_side) 
                VALUES (gen_random_uuid(), v_tournament_id, p_stage_id, v_round, v_match_num, 'pending', 'losers');
            END LOOP;
        END LOOP;
        
        -- Grand Finals
        v_gf_id := gen_random_uuid();
        INSERT INTO tournament_matches (id, tournament_id, stage_id, round, match_number, status, bracket_side) 
        VALUES (v_gf_id, v_tournament_id, p_stage_id, v_num_rounds + 1, 1, 'pending', 'final');
    ELSE
        RAISE EXCEPTION 'Unsupported format: %', v_format;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.generate_stage_bracket IS 'Generates bracket matches for a tournament stage. Best of setting is derived from stage.config.bestOf at runtime.';
