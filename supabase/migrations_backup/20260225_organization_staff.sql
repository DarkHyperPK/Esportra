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
