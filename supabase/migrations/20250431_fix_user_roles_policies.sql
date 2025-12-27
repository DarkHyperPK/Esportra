-- First ensure RLS is enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Basic policies for user_roles
CREATE POLICY "users_can_view_own_role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_role"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_role"
ON public.user_roles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_role"
ON public.user_roles
FOR DELETE
USING (auth.uid() = user_id);

-- Allow authenticated users to view all roles (needed for UI components)
CREATE POLICY "authenticated_can_view_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true); 