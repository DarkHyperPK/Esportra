-- Create undo_match_advancement function to handle match resets
CREATE OR REPLACE FUNCTION public.undo_match_advancement(p_match_id UUID)
RETURNS VOID AS $$
DECLARE
    r RECORD;
BEGIN
    -- Find target matches where this match advanced teams to
    FOR r IN (SELECT target_match_id, target_slot FROM public.brkt_advancements WHERE source_match_id = p_match_id) LOOP
        -- Remove the team from the target slot and reset match status
        IF r.target_slot = 1 THEN
            UPDATE public.brkt_matches 
            SET 
                team1_id = NULL, 
                status = 'pending', 
                winner_id = NULL, 
                loser_id = NULL,
                team1_score = NULL,
                team2_score = NULL
            WHERE id = r.target_match_id;
        ELSIF r.target_slot = 2 THEN
            UPDATE public.brkt_matches 
            SET 
                team2_id = NULL, 
                status = 'pending', 
                winner_id = NULL, 
                loser_id = NULL,
                team1_score = NULL,
                team2_score = NULL
            WHERE id = r.target_match_id;
        END IF;
        
        -- Recursively undo if the target match was also advanced (though usually a reset starts from a leaf or middle)
        -- For now, we'll keep it simple and just clear the immediate next step. 
        -- If the user needs to reset a whole branch, they might need to do it systematically.
    END LOOP;
END;
$$ LANGUAGE plpgsql;
