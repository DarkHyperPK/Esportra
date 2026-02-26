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
