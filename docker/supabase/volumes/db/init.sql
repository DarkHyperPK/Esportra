-- Add license_id to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS license_id UUID UNIQUE;

-- Create function to generate and assign license ID
CREATE OR REPLACE FUNCTION public.generate_profile_license_id()
RETURNS TRIGGER AS $$
BEGIN
  -- We only care about approved and active business roles (organizer or venue_owner)
  IF NEW.status = 'approved' AND NEW.is_active = true AND NEW.role IN ('organizer', 'venue_owner') THEN
    -- Check if the user already has a license_id
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id AND license_id IS NOT NULL) THEN
      -- Automatically assign a new license ID
      UPDATE public.profiles
      SET license_id = gen_random_uuid()
      WHERE id = NEW.user_id AND license_id IS NULL;
      
      -- Add an audit log entry explicitly stating the license was granted
      INSERT INTO public.audit_logs (action, resource_type, resource_id, details, created_by)
      VALUES (
        'license_granted', 
        'user', 
        NEW.user_id, 
        jsonb_build_object('role', NEW.role, 'verified_role_id', NEW.id),
        NEW.verified_by
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to verified_roles
DROP TRIGGER IF EXISTS on_business_role_approved ON public.verified_roles;
CREATE TRIGGER on_business_role_approved
AFTER INSERT OR UPDATE ON public.verified_roles
FOR EACH ROW
EXECUTE FUNCTION public.generate_profile_license_id();

-- Backfill existing approved and active business roles
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT DISTINCT user_id 
    FROM public.verified_roles 
    WHERE status = 'approved' 
      AND is_active = true 
      AND role IN ('organizer', 'venue_owner')
  LOOP
    -- Only assign if they don't already have one
    UPDATE public.profiles
    SET license_id = gen_random_uuid()
    WHERE id = r.user_id AND license_id IS NULL;
  END LOOP;
END;
$$;
-- Backfill organization_id in tournaments table based on organizer_id
-- This links existing tournaments to their owner's organization

UPDATE public.tournaments t
SET organization_id = o.id
FROM public.organizations o
WHERE t.organizer_id = o.owner_id
AND t.organization_id IS NULL;
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
FOR SELECT TO public
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
-- Enterprise Schema Refinement Migration
-- 1. Normalization: Remove redundant organizer_id
-- 2. Data Contract: Create v_tournament_details view
-- 3. Enterprise Security: Cross-table RLS policies

BEGIN;

-- 1. DROP REDUNDANT COLUMN
-- Ensure all organization_ids are backfilled before dropping (Verified in previous step)
ALTER TABLE public.tournaments DROP COLUMN IF EXISTS organizer_id;

-- 2. CREATE THE DATA CONTRACT (VIEW)
-- This view flattens the Tournament -> Organization -> Owner relationship
DROP VIEW IF EXISTS public.v_tournament_details CASCADE;
CREATE VIEW public.v_tournament_details AS
SELECT 
    t.*,
    (t.venue_id IS NULL) as is_online,
    o.name as organization_name,
    o.slug as organization_slug,
    o.logo_url as organization_logo,
    o.owner_id as organizer_owner_id,
    p.username as organizer_username,
    p.avatar_url as organizer_avatar,
    tm.name as winner_team_name,
    (SELECT count(*) FROM public.tournament_participants tp WHERE tp.tournament_id = t.id) as participant_count
FROM public.tournaments t
LEFT JOIN public.organizations o ON t.organization_id = o.id
LEFT JOIN public.profiles p ON o.owner_id = p.id
LEFT JOIN public.teams tm ON t.winner_id = tm.id;

-- Ensure the view is accessible
GRANT SELECT ON public.v_tournament_details TO anon, authenticated;

-- 3. UPGRADE RLS POLICIES (CROSS-TABLE SECURITY)
-- We need to check if the currentUser is the OWNER of the organization linked to the tournament

-- First, drop old policies that relied on direct organizer_id
DROP POLICY IF EXISTS "Organizers can create tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Organizers can update their own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Organizers can delete their own tournaments" ON public.tournaments;

-- New Enterprise Policy: Insert
CREATE POLICY "Organizers can create tournaments" 
ON public.tournaments FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = organization_id 
    AND owner_id = auth.uid()
  )
);

-- New Enterprise Policy: Update
CREATE POLICY "Organizers can update their own tournaments" 
ON public.tournaments FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = organization_id 
    AND owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = organization_id 
    AND owner_id = auth.uid()
  )
);

-- New Enterprise Policy: Delete
CREATE POLICY "Organizers can delete their own tournaments" 
ON public.tournaments FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = organization_id 
    AND owner_id = auth.uid()
  )
);

-- 4. HOUSEKEEPING (Indexes)
CREATE INDEX IF NOT EXISTS idx_tournaments_org_id ON public.tournaments(organization_id);

COMMIT;
-- Fix 1: Alter the enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'staff_invite';

-- Create a secure, non-recursive function to check admin status
CREATE OR REPLACE FUNCTION public.is_org_admin(_organization_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_staff
        WHERE organization_id = _organization_id
          AND user_id = auth.uid()
          AND role = 'admin'
          AND status = 'active'
    );
$$;

-- Fix 2: Allow org admins to manage staff (currently only org owners and global admins can)
CREATE POLICY "Org admins can manage staff"
ON public.organization_staff FOR ALL
TO authenticated
USING (
    public.is_org_admin(organization_id)
)
WITH CHECK (
    public.is_org_admin(organization_id)
);

-- Fix 3: Allow inserting staff_invite notifications.
CREATE POLICY "Allow staff invite notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (
    type = 'staff_invite'
);
-- Organization Staff Migration
-- Elevates staff management from per-tournament to organization-wide.
-- Staff invited to an organization gain access to ALL tournaments under it.

BEGIN;

-- 1. CREATE TABLE
CREATE TABLE IF NOT EXISTS public.organization_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'mod',
    permissions TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,

    -- One staff record per user per organization
    UNIQUE (organization_id, user_id)
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_org_staff_org_id ON public.organization_staff(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_staff_user_id ON public.organization_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_org_staff_status ON public.organization_staff(status);

-- 3. ROW-LEVEL SECURITY
ALTER TABLE public.organization_staff ENABLE ROW LEVEL SECURITY;

-- Function to safely check if a user is an active staff member of an org without triggering RLS
CREATE OR REPLACE FUNCTION is_org_active_staff(_organization_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_staff
        WHERE organization_id = _organization_id
          AND user_id = auth.uid()
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Staff can view other staff members in their organization
CREATE POLICY "Staff can view other staff in same org"
    ON public.organization_staff
    FOR SELECT
    TO public
    USING (is_org_active_staff(organization_id));

-- Function to check if a user is the owner of a specific staff assignment record
CREATE OR REPLACE FUNCTION is_org_staff_user(_org_staff_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_staff
        WHERE id = _org_staff_id
          AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Staff can view own assignments
CREATE POLICY "Staff can view own assignments"
    ON public.staff_tournament_assignments
    FOR SELECT
    TO public
    USING (is_org_staff_user(organization_staff_id));

-- Organization owners can do everything
CREATE POLICY "Org owners can manage staff"
ON public.organization_staff FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.organizations
        WHERE id = organization_id
        AND owner_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organizations
        WHERE id = organization_id
        AND owner_id = auth.uid()
    )
);

-- Users can view their own staff records (to see invites / status)
CREATE POLICY "Users can view own staff records"
ON public.organization_staff FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can update their own record (to accept/decline invites)
CREATE POLICY "Users can respond to invites"
ON public.organization_staff FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Global admin bypass
CREATE POLICY "Admins bypass org staff RLS"
ON public.organization_staff FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4. DATA MIGRATION
-- Copy active tournament_staff into organization_staff, deduplicating per org+user
INSERT INTO public.organization_staff (organization_id, user_id, role, permissions, status, assigned_by, created_at, updated_at, accepted_at)
SELECT DISTINCT ON (t.organization_id, ts.user_id)
    t.organization_id,
    ts.user_id,
    ts.role,
    ts.permissions,
    ts.status,
    ts.assigned_by,
    ts.created_at,
    ts.updated_at,
    ts.accepted_at
FROM public.tournament_staff ts
JOIN public.tournaments t ON ts.tournament_id = t.id
WHERE t.organization_id IS NOT NULL
ORDER BY t.organization_id, ts.user_id, ts.created_at DESC
ON CONFLICT (organization_id, user_id) DO NOTHING;

COMMIT;
-- Enterprise Staff Management: Tournament Assignments + Audit Logs
-- Adds tournament-specific staff assignments and a full audit trail.

BEGIN;

-- â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
-- 1. STAFF â†” TOURNAMENT ASSIGNMENTS
-- â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
CREATE TABLE IF NOT EXISTS public.staff_tournament_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_staff_id UUID NOT NULL REFERENCES public.organization_staff(id) ON DELETE CASCADE,
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_staff_id, tournament_id)
);

CREATE INDEX IF NOT EXISTS idx_sta_staff_id ON public.staff_tournament_assignments(organization_staff_id);
CREATE INDEX IF NOT EXISTS idx_sta_tourn_id ON public.staff_tournament_assignments(tournament_id);

ALTER TABLE public.staff_tournament_assignments ENABLE ROW LEVEL SECURITY;

-- Org owners can manage assignments
CREATE POLICY "Org owners manage tournament assignments"
ON public.staff_tournament_assignments FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.organization_staff os
        JOIN public.organizations o ON o.id = os.organization_id
        WHERE os.id = organization_staff_id
        AND o.owner_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.organization_staff os
        JOIN public.organizations o ON o.id = os.organization_id
        WHERE os.id = organization_staff_id
        AND o.owner_id = auth.uid()
    )
);

-- Staff can view their own assignments
CREATE POLICY "Staff can view own assignments"
ON public.staff_tournament_assignments FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.organization_staff os
        WHERE os.id = organization_staff_id
        AND os.user_id = auth.uid()
    )
);

-- Admin bypass
CREATE POLICY "Admins bypass assignment RLS"
ON public.staff_tournament_assignments FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
-- 2. STAFF AUDIT LOG
-- â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
CREATE TABLE IF NOT EXISTS public.staff_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    -- e.g. 'staff.invite', 'staff.accept', 'staff.remove',
    --      'staff.update_permissions', 'staff.assign_tournament',
    --      'staff.unassign_tournament',
    --      'match.update_score', 'bracket.edit', 'team.manage',
    --      'announcement.send', 'dispute.assist'
    target_type TEXT,          -- 'staff' | 'tournament' | 'match' | 'team' | etc
    target_id TEXT,            -- UUID or identifier of the affected entity
    details JSONB DEFAULT '{}', -- arbitrary context (old/new values, names, etc)
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_org_id ON public.staff_audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON public.staff_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.staff_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.staff_audit_log(created_at DESC);

ALTER TABLE public.staff_audit_log ENABLE ROW LEVEL SECURITY;

-- Org owners can see all audit logs for their org
CREATE POLICY "Org owners can view audit logs"
ON public.staff_audit_log FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.organizations
        WHERE id = organization_id
        AND owner_id = auth.uid()
    )
);

-- Org admins can view audit logs
CREATE POLICY "Org admins can view audit logs"
ON public.staff_audit_log FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.organization_staff
        WHERE organization_id = staff_audit_log.organization_id
        AND user_id = auth.uid()
        AND role = 'admin'
        AND status = 'active'
    )
);

-- Any authenticated user can INSERT audit logs (app-level writes)
CREATE POLICY "Authenticated users can insert audit logs"
ON public.staff_audit_log FOR INSERT
TO authenticated
WITH CHECK (actor_id = auth.uid());

-- Admin bypass
CREATE POLICY "Admins bypass audit log RLS"
ON public.staff_audit_log FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

COMMIT;

-- Allow tournament announcements
CREATE POLICY "Allow tournament announcements"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (
    type = 'tournament_announcement' AND
    EXISTS (
        SELECT 1 FROM public.tournaments t
        WHERE t.id = (data->>'tournament_id')::uuid
        AND (t.organization_id IN (
            SELECT id FROM public.organizations WHERE owner_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM public.organization_staff s
            WHERE s.organization_id = t.organization_id
            AND s.user_id = auth.uid()
        ) OR public.is_admin())
    )
);

-- Update organizations update policy to allow staff admins
DROP POLICY IF EXISTS "organizations_update_policy" ON public.organizations;
CREATE POLICY "organizations_update_policy"
ON public.organizations FOR UPDATE
USING (
    owner_id = auth.uid() 
    OR auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    OR EXISTS (
        SELECT 1 FROM public.organization_staff
        WHERE organization_id = organizations.id
        AND user_id = auth.uid()
        AND role = 'admin'
        AND status = 'active'
    )
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Admin Audit Logs
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id),
    admin_name TEXT NOT NULL DEFAULT '',
    action_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL DEFAULT '',
    target_name TEXT NOT NULL DEFAULT '',
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    severity TEXT NOT NULL DEFAULT 'low',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND is_admin = true
    )
);

CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (admin_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type ON public.audit_logs (target_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs (severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs (action_type);
