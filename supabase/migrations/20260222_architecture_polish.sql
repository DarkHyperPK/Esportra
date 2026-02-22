-- New Migration for Bracket Architecture Polish
-- 1. Create match_completed_events table
CREATE TABLE IF NOT EXISTS public.match_completed_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.brkt_matches(id) ON DELETE CASCADE,
    winner_id UUID REFERENCES public.teams(id),
    loser_id UUID REFERENCES public.teams(id),
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processed, error
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Enable RLS (Internal system table only)
ALTER TABLE public.match_completed_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service Role Only" ON public.match_completed_events
    FOR ALL USING (auth.role() = 'service_role');

-- 2. Add version column to brkt_matches for optimistic locking
ALTER TABLE public.brkt_matches 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;

-- 3. Add cached_ui_state column to brkt_versions
ALTER TABLE public.brkt_versions
ADD COLUMN IF NOT EXISTS cached_ui_state JSONB;

-- 4. Create the RPC for idempotent match advancement
CREATE OR REPLACE FUNCTION public.finalize_match_locked(
    p_match_id UUID,
    p_winner_id UUID,
    p_loser_id UUID,
    p_expected_version INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_version INTEGER;
BEGIN
    -- Attempt to lock the row and get current version
    SELECT version INTO v_current_version
    FROM public.brkt_matches
    WHERE id = p_match_id
    FOR UPDATE NOWAIT; -- Fail fast if someone else has the lock

    -- Check if version matches exactly what the client expected
    IF v_current_version != p_expected_version THEN
        -- Optimistic locking failure (someone else updated it)
        RETURN FALSE;
    END IF;

    -- Update the match state and increment version
    UPDATE public.brkt_matches
    SET 
        status = 'completed',
        winner_id = p_winner_id,
        loser_id = p_loser_id,
        version = version + 1
    WHERE id = p_match_id;

    -- Fire the completely decoupled event
    INSERT INTO public.match_completed_events (match_id, winner_id, loser_id)
    VALUES (p_match_id, p_winner_id, p_loser_id);

    RETURN TRUE;
EXCEPTION
    WHEN lock_not_available THEN
        -- Row is currently locked by another transaction, standard race condition
        RETURN FALSE;
END;
$$;
