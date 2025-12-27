-- RPC to enroll a team in a stage
CREATE OR REPLACE FUNCTION public.enroll_team_in_stage(
    p_stage_id UUID,
    p_team_id UUID
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if stage is locked
    IF EXISTS (SELECT 1 FROM tournament_stages WHERE id = p_stage_id AND is_locked = true) THEN
        RAISE EXCEPTION 'Stage is locked and cannot accept new enrollments';
    END IF;

    -- Check if already enrolled
    IF EXISTS (SELECT 1 FROM stage_participants WHERE stage_id = p_stage_id AND team_id = p_team_id) THEN
        RETURN;
    END IF;

    INSERT INTO stage_participants (stage_id, team_id)
    VALUES (p_stage_id, p_team_id);
END;
$$;

-- RPC to get teams enrolled in a stage
CREATE OR REPLACE FUNCTION public.get_stage_teams(p_stage_id UUID)
RETURNS TABLE (
    team_id UUID,
    name TEXT,
    logo_url TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.name, t.logo_url
    FROM stage_participants sp
    JOIN teams t ON t.id = sp.team_id
    WHERE sp.stage_id = p_stage_id;
END;
$$;

-- RPC to advance teams to the next stage
CREATE OR REPLACE FUNCTION public.advance_teams_to_next_stage(
    p_current_stage_id UUID
)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_tournament_id UUID;
    v_next_stage_id UUID;
    v_advancement_count INTEGER;
    v_advanced_count INTEGER := 0;
    v_team_id UUID;
BEGIN
    -- 1. Get current stage details
    SELECT tournament_id, advancement_count INTO v_tournament_id, v_advancement_count
    FROM tournament_stages
    WHERE id = p_current_stage_id;

    IF v_advancement_count IS NULL OR v_advancement_count <= 0 THEN
        RAISE EXCEPTION 'Advancement count not set for this stage';
    END IF;

    -- 2. Find next stage
    SELECT id INTO v_next_stage_id
    FROM tournament_stages
    WHERE tournament_id = v_tournament_id
    AND stage_order > (SELECT stage_order FROM tournament_stages WHERE id = p_current_stage_id)
    ORDER BY stage_order ASC
    LIMIT 1;

    IF v_next_stage_id IS NULL THEN
        RAISE EXCEPTION 'No next stage found';
    END IF;

    -- 3. Identify top N teams
    -- This is a simplified logic: Top N teams based on the furthest round reached and then match_number
    -- In a real system, this would be more complex (e.g., points in Round Robin)
    FOR v_team_id IN (
        WITH team_performance AS (
            SELECT 
                team_id,
                MAX(round) as max_round,
                COUNT(*) FILTER (WHERE winner_id = team_id) as wins
            FROM (
                SELECT team1_id as team_id, round, winner_id FROM tournament_matches WHERE stage_id = p_current_stage_id AND team1_id IS NOT NULL
                UNION ALL
                SELECT team2_id as team_id, round, winner_id FROM tournament_matches WHERE stage_id = p_current_stage_id AND team2_id IS NOT NULL
            ) all_teams
            GROUP BY team_id
        )
        SELECT tp.team_id
        FROM team_performance tp
        ORDER BY tp.max_round DESC, tp.wins DESC
        LIMIT v_advancement_count
    ) LOOP
        -- 4. Enroll in next stage
        PERFORM public.enroll_team_in_stage(v_next_stage_id, v_team_id);
        v_advanced_count := v_advanced_count + 1;
    END LOOP;

    RETURN v_advanced_count;
END;
$$;
