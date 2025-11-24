-- Fix RLS policy to allow ONLY SUPER ADMINS to update profiles for role assignment
-- This migration adds a policy that allows super admins (not regular admins) to update any profile

BEGIN;

-- Drop existing admin update policy if it exists
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_super_admin" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Create helper function to check if user is super admin
-- This uses SECURITY DEFINER to bypass RLS when checking admin_roles
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = p_user_id 
    AND is_admin = TRUE
    AND admin_roles @> ARRAY['super_admin']::TEXT[]
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy for SUPER ADMINS ONLY to update any profile
-- This ensures only super admins can assign/revoke roles, not finance admins, moderation admins, etc.
CREATE POLICY "profiles_update_super_admin" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.is_admin = TRUE
      AND p.admin_roles @> ARRAY['super_admin']::TEXT[]
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.is_admin = TRUE
      AND p.admin_roles @> ARRAY['super_admin']::TEXT[]
    )
  );

COMMIT;

