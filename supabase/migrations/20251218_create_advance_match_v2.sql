-- advance_match_v2: Handles match advancement using explicit links
-- Supports both Single and Double Elimination

CREATE OR REPLACE FUNCTION public.advance_match_v2(
    p_match_id UUID,
    p_winner_id UUID,
    p_team1_score INTEGER,
    p_team2_score INTEGER
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_match RECORD;
    v_loser_id UUID;
    v_next_match RECORD;
    v_loser_next_match RECORD;
BEGIN
    -- 1. Get current match details
    SELECT * INTO v_match FROM tournament_matches WHERE id = p_match_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found';
    END IF;

    -- 2. Determine loser
    IF p_winner_id = v_match.team1_id THEN
        v_loser_id := v_match.team2_id;
    ELSIF p_winner_id = v_match.team2_id THEN
        v_loser_id := v_match.team1_id;
    ELSE
        RAISE EXCEPTION 'Winner ID must be one of the participants';
    END IF;

    -- 3. Update current match
    UPDATE tournament_matches
    SET 
        winner_id = p_winner_id,
        team1_score = p_team1_score,
        team2_score = p_team2_score,
        status = 'completed',
        updated_at = NOW()
    WHERE id = p_match_id;

    -- 4. Advance Winner
    IF v_match.next_match_id IS NOT NULL THEN
        SELECT * INTO v_next_match FROM tournament_matches WHERE id = v_match.next_match_id;
        
        IF v_next_match.team1_id IS NULL THEN
            UPDATE tournament_matches SET team1_id = p_winner_id WHERE id = v_match.next_match_id;
        ELSIF v_next_match.team2_id IS NULL THEN
            UPDATE tournament_matches SET team2_id = p_winner_id WHERE id = v_match.next_match_id;
        ELSE
            -- If both slots are full, we might be re-reporting. 
            -- For now, let's assume we overwrite team1 if it matches or if we're unsure.
            -- A better way is to know which slot this match feeds into.
            -- But for now, let's just update the one that matches the old winner if it was there.
            UPDATE tournament_matches 
            SET team1_id = CASE WHEN team1_id = p_winner_id THEN p_winner_id ELSE team1_id END,
                team2_id = CASE WHEN team2_id = p_winner_id THEN p_winner_id ELSE team2_id END
            WHERE id = v_match.next_match_id;
        END IF;
    END IF;

    -- 5. Advance Loser (Double Elimination)
    IF v_match.loser_next_match_id IS NOT NULL AND v_loser_id IS NOT NULL THEN
        SELECT * INTO v_loser_next_match FROM tournament_matches WHERE id = v_match.loser_next_match_id;
        
        IF v_loser_next_match.team1_id IS NULL THEN
            UPDATE tournament_matches SET team1_id = v_loser_id WHERE id = v_match.loser_next_match_id;
        ELSIF v_loser_next_match.team2_id IS NULL THEN
            UPDATE tournament_matches SET team2_id = v_loser_id WHERE id = v_match.loser_next_match_id;
        END IF;
    END IF;

END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.advance_match_v2(UUID, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_match_v2(UUID, UUID, INTEGER, INTEGER) TO service_role;
