-- Enterprise Staff Management: Tournament Assignments + Audit Logs
-- Adds tournament-specific staff assignments and a full audit trail.

BEGIN;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. STAFF ↔ TOURNAMENT ASSIGNMENTS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. STAFF AUDIT LOG
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
