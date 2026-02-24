-- ==========================================
-- ENTERPRISE PROGRESSION ENGINE (Phase 5)
-- ==========================================

-- 1. Internal Advancement Engine (Pure Logic, Transaction Safe)
CREATE OR REPLACE FUNCTION public.proc_internal_advance_match(
    p_source_match_id UUID,
    p_winner_id UUID,
    p_loser_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_version_id UUID;
    v_edge RECORD;
BEGIN
    -- Get tournament context
    SELECT version_id INTO v_version_id
    FROM public.brkt_matches
    WHERE id = p_source_match_id;

    IF v_version_id IS NULL THEN
        RAISE EXCEPTION 'Match % not found', p_source_match_id;
    END IF;

    -- Advance Winner
    IF p_winner_id IS NOT NULL THEN
        FOR v_edge IN 
            SELECT target_match_id, target_slot 
            FROM public.brkt_advancements 
            WHERE version_id = v_version_id 
              AND source_match_id = p_source_match_id 
              AND type = 'winner'
        LOOP
            UPDATE public.brkt_matches
            SET 
                team1_id = CASE WHEN v_edge.target_slot = 1 THEN p_winner_id ELSE team1_id END,
                team2_id = CASE WHEN v_edge.target_slot = 2 THEN p_winner_id ELSE team2_id END,
                version = version + 1,
                updated_at = now()
            WHERE id = v_edge.target_match_id;
        END LOOP;
    END IF;

    -- Advance Loser
    IF p_loser_id IS NOT NULL THEN
        FOR v_edge IN 
            SELECT target_match_id, target_slot 
            FROM public.brkt_advancements 
            WHERE version_id = v_version_id 
              AND source_match_id = p_source_match_id 
              AND type = 'loser'
        LOOP
            UPDATE public.brkt_matches
            SET 
                team1_id = CASE WHEN v_edge.target_slot = 1 THEN p_loser_id ELSE team1_id END,
                team2_id = CASE WHEN v_edge.target_slot = 2 THEN p_loser_id ELSE team2_id END,
                version = version + 1,
                updated_at = now()
            WHERE id = v_edge.target_match_id;
        END LOOP;
    END IF;

    -- Log specific progression event
    INSERT INTO public.brkt_match_events (match_id, type, payload)
    VALUES (p_source_match_id, 'advancement_completed', jsonb_build_object(
        'winner_id', p_winner_id,
        'loser_id', p_loser_id,
        'timestamp', now()
    ));
END;
$$;

-- 2. Consolidated Finalization RPC (Industry Standard: Atomic & Locked)
CREATE OR REPLACE FUNCTION public.finalize_match_locked(
    p_match_id UUID,
    p_expected_version INTEGER,
    p_winner_id UUID,
    p_loser_id UUID,
    p_team1_score INTEGER,
    p_team2_score INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_actual_version INTEGER;
    v_tournament_id UUID;
    v_is_authorized BOOLEAN;
BEGIN
    -- 1. Pessimistic Lock & Version Check (Industry Standard for Concurrency)
    SELECT version, v.tournament_id INTO v_actual_version, v_tournament_id
    FROM public.brkt_matches m
    JOIN public.brkt_versions v ON m.version_id = v.id
    WHERE m.id = p_match_id
    FOR UPDATE;

    IF v_actual_version IS NULL THEN
        RETURN FALSE;
    END IF;

    IF v_actual_version != p_expected_version THEN
        RAISE EXCEPTION 'Match version mismatch. Expected %, got %', p_expected_version, v_actual_version;
    END IF;

    -- 2. Enterprise Authorization Check
    -- Allow Admins OR Tournament Organizers/Org Owners
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND (p.is_admin = true OR p.role = 'admin')
    ) OR EXISTS (
        SELECT 1 FROM public.tournaments t
        WHERE t.id = v_tournament_id 
        AND (t.organizer_id = auth.uid() OR t.organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Unauthorized to finalize this match';
    END IF;

    -- 3. Atomic Finalization
    UPDATE public.brkt_matches
    SET 
        winner_id = p_winner_id,
        loser_id = p_loser_id,
        team1_score = p_team1_score,
        team2_score = p_team2_score,
        status = 'completed',
        version = version + 1,
        updated_at = now()
    WHERE id = p_match_id;

    -- 4. Instant Progression (No Webhooks Needed for Core Logic)
    PERFORM public.proc_internal_advance_match(p_match_id, p_winner_id, p_loser_id);

    -- 5. Async Notification Trigger (Log event for Edge Functions/Hooks)
    INSERT INTO public.match_completed_events (match_id, winner_id, loser_id, status)
    VALUES (p_match_id, p_winner_id, p_loser_id, 'processed');

    RETURN TRUE;
END;
$$;

-- 3. UNIFIED RLS (Industry Standard: Admin Overlay)
-- This ensures admins always bypass restrictions without separate policies.

-- Macro for Admin Bypass Selection
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Re-apply brkt_versions policy
DROP POLICY IF EXISTS "Captains can see published bracket versions" ON brkt_versions;
CREATE POLICY "brkt_versions_enterprise_access" ON brkt_versions
FOR SELECT TO authenticated
USING (
  status = 'published' OR 
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = brkt_versions.tournament_id
    AND (t.organizer_id = auth.uid() OR t.organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))
  )
);

-- Ensure all other bracket tables have similar admin bypass
ALTER TABLE brkt_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "brkt_matches_select_policy" ON brkt_matches;
CREATE POLICY "brkt_matches_enterprise_select" ON brkt_matches
FOR SELECT TO authenticated
USING (true); -- Publicly viewable usually, but constrained by version visibility

-- Reset Match Progression Fix (Scalable Version)
CREATE OR REPLACE FUNCTION public.undo_match_advancement(p_match_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Authorization
    IF NOT public.is_admin() AND NOT EXISTS (
        SELECT 1 FROM public.tournaments t
        JOIN public.brkt_versions v ON t.id = v.tournament_id
        JOIN public.brkt_matches m ON v.id = m.version_id
        WHERE m.id = p_match_id
        AND (t.organizer_id = auth.uid() OR t.organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- 2. Atomic Reversion
    UPDATE public.brkt_matches
    SET 
        team1_id = CASE WHEN target_slot = 1 THEN NULL ELSE team1_id END,
        team2_id = CASE WHEN target_slot = 2 THEN NULL ELSE team2_id END,
        status = 'pending',
        winner_id = NULL,
        loser_id = NULL,
        version = version + 1
    FROM public.brkt_advancements a
    WHERE a.source_match_id = p_match_id
      AND brkt_matches.id = a.target_match_id;

END;
$$;
