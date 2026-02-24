-- 1. Create a function to handle bracket advancement in the database
CREATE OR REPLACE FUNCTION public.proc_advance_bracket_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_version_id UUID;
    v_edge RECORD;
    v_update_field TEXT;
BEGIN
    -- Only process if status is 'pending' (default)
    IF NEW.status != 'pending' THEN
        RETURN NEW;
    END IF;

    -- 1. Get the match's version_id
    SELECT version_id INTO v_version_id
    FROM public.brkt_matches
    WHERE id = NEW.match_id;

    IF v_version_id IS NULL THEN
        UPDATE public.match_completed_events
        SET status = 'failed', error_message = 'Match not found'
        WHERE id = NEW.id;
        RETURN NEW;
    END IF;

    -- 2. Advance Winner
    FOR v_edge IN 
        SELECT target_match_id, target_slot 
        FROM public.brkt_advancements 
        WHERE version_id = v_version_id 
          AND source_match_id = NEW.match_id 
          AND type = 'winner'
    LOOP
        v_update_field := CASE WHEN v_edge.target_slot = 1 THEN 'team1_id' ELSE 'team2_id' END;
        
        UPDATE public.brkt_matches
        SET 
            -- Update the team
            team1_id = CASE WHEN v_edge.target_slot = 1 THEN NEW.winner_id ELSE team1_id END,
            team2_id = CASE WHEN v_edge.target_slot = 2 THEN NEW.winner_id ELSE team2_id END,
            -- Update overall version for optimistic locking
            version = version + 1
        WHERE id = v_edge.target_match_id;
    END LOOP;

    -- 3. Advance Loser
    FOR v_edge IN 
        SELECT target_match_id, target_slot 
        FROM public.brkt_advancements 
        WHERE version_id = v_version_id 
          AND source_match_id = NEW.match_id 
          AND type = 'loser'
    LOOP
        UPDATE public.brkt_matches
        SET 
            team1_id = CASE WHEN v_edge.target_slot = 1 THEN NEW.loser_id ELSE team1_id END,
            team2_id = CASE WHEN v_edge.target_slot = 2 THEN NEW.loser_id ELSE team2_id END,
            version = version + 1
        WHERE id = v_edge.target_match_id;
    END LOOP;

    -- 4. Mark as processed
    NEW.status := 'processed';
    NEW.processed_at := now();

    -- 5. Trigger cache rebuild notify (optional, but good practice)
    PERFORM pg_notify('bracket_update', json_build_object('version_id', v_version_id)::text);

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    NEW.status := 'failed';
    NEW.error_message := SQLERRM;
    RETURN NEW;
END;
$$;

-- 2. Add the trigger to match_completed_events
DROP TRIGGER IF EXISTS trigger_advance_bracket_db ON public.match_completed_events;
CREATE TRIGGER trigger_advance_bracket_db
BEFORE INSERT ON public.match_completed_events
FOR EACH ROW
EXECUTE FUNCTION public.proc_advance_bracket_match();

-- 3. Update RLS for brkt_versions to allow admins and organizers more flexibility
-- We already have a policy, but let's make sure it covers 'draft' for them.
-- The previous policy already does this via the EXISTS clause.

-- 4. Ensure match_completed_events status column exists and is used correctly
-- (I checked earlier, it exists with default 'pending')

-- 5. Finalize match locked RPC fix (ensure it works with the new trigger)
-- The RPC inserts into match_completed_events, which now triggers the advancement immediately.
