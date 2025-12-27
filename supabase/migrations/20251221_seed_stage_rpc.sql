-- RPC to seed a stage with all registered teams from the tournament
CREATE OR REPLACE FUNCTION public.seed_stage_from_registrations(
    p_stage_id UUID
)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_tournament_id UUID;
    v_team_id UUID;
    v_count INTEGER := 0;
BEGIN
    -- 1. Get tournament ID from stage
    SELECT tournament_id INTO v_tournament_id
    FROM tournament_stages
    WHERE id = p_stage_id;

    IF v_tournament_id IS NULL THEN
        RAISE EXCEPTION 'Stage not found';
    END IF;

    -- 2. Loop through approved participants and enroll them
    -- Using tournament_participants table
    
    FOR v_team_id IN (
        SELECT team_id 
        FROM tournament_participants 
        WHERE tournament_id = v_tournament_id 
        AND status = 'approved' -- Only approved teams
        AND team_id IS NOT NULL
    ) LOOP
        -- Enroll team if not already enrolled
        IF NOT EXISTS (SELECT 1 FROM stage_participants WHERE stage_id = p_stage_id AND team_id = v_team_id) THEN
            INSERT INTO stage_participants (stage_id, team_id)
            VALUES (p_stage_id, v_team_id);
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$;
