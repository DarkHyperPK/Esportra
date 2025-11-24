-- Fix recursive profile update policy and rely on admin_user_roles mapping
-- Instead of referencing profiles inside the policy (which caused recursion),
-- we now check admin_user_roles + admin_roles to verify super admin status.

BEGIN;

-- Clean up previous artifacts
DROP POLICY IF EXISTS "profiles_update_super_admin" ON public.profiles;
DROP FUNCTION IF EXISTS public.is_super_admin;

-- Helper expression to detect super admin role even if 'key' column is missing
-- COALESCE(ar.key, lower(ar.name)) will normalize role identifier

CREATE POLICY "profiles_update_super_admin" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_user_roles aur
      JOIN public.admin_roles ar ON ar.id = aur.role_id
      WHERE aur.user_id = auth.uid()
        AND lower(ar.name) = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_user_roles aur
      JOIN public.admin_roles ar ON ar.id = aur.role_id
      WHERE aur.user_id = auth.uid()
        AND lower(ar.name) = 'super_admin'
    )
  );

COMMIT;

