-- Multi-Role System Migration
-- Allows users to have multiple roles simultaneously (e.g., organizer + venue_owner)
-- Run this in your Supabase SQL Editor

-- First, let's ensure we have the user_roles table with proper structure
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('casual', 'organizer', 'venue_owner', 'admin')),
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false, -- One role can be marked as primary
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role) -- Prevent duplicate roles for same user
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON public.user_roles(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_primary ON public.user_roles(user_id, is_primary) WHERE is_primary = true;

-- Create role permissions table to define what each role can do
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('casual', 'organizer', 'venue_owner', 'admin')),
  permission TEXT NOT NULL,
  resource TEXT NOT NULL, -- e.g., 'tournaments', 'venues', 'teams'
  action TEXT NOT NULL, -- e.g., 'create', 'read', 'update', 'delete', 'manage'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, permission)
);

-- Insert default role permissions
INSERT INTO public.role_permissions (role, permission, resource, action) VALUES
-- Casual user permissions
('casual', 'create_teams', 'teams', 'create'),
('casual', 'join_teams', 'teams', 'join'),
('casual', 'join_tournaments', 'tournaments', 'join'),
('casual', 'report_scores', 'tournaments', 'report'),
('casual', 'view_venues', 'venues', 'read'),

-- Organizer permissions
('organizer', 'create_tournaments', 'tournaments', 'create'),
('organizer', 'manage_tournaments', 'tournaments', 'manage'),
('organizer', 'verify_results', 'tournaments', 'verify'),
('organizer', 'manage_teams', 'teams', 'manage'),
('organizer', 'view_venues', 'venues', 'read'),
('organizer', 'create_teams', 'teams', 'create'),
('organizer', 'join_teams', 'teams', 'join'),
('organizer', 'join_tournaments', 'tournaments', 'join'),
('organizer', 'report_scores', 'tournaments', 'report'),

-- Venue owner permissions
('venue_owner', 'create_venues', 'venues', 'create'),
('venue_owner', 'manage_venues', 'venues', 'manage'),
('venue_owner', 'book_venues', 'venues', 'book'),
('venue_owner', 'view_tournaments', 'tournaments', 'read'),
('venue_owner', 'create_teams', 'teams', 'create'),
('venue_owner', 'join_teams', 'teams', 'join'),
('venue_owner', 'join_tournaments', 'tournaments', 'join'),
('venue_owner', 'report_scores', 'tournaments', 'report'),

-- Admin permissions (can do everything)
('admin', 'manage_all', 'all', 'manage'),
('admin', 'create_tournaments', 'tournaments', 'create'),
('admin', 'manage_tournaments', 'tournaments', 'manage'),
('admin', 'create_venues', 'venues', 'create'),
('admin', 'manage_venues', 'venues', 'manage'),
('admin', 'create_teams', 'teams', 'create'),
('admin', 'manage_teams', 'teams', 'manage'),
('admin', 'assign_roles', 'users', 'manage'),
('admin', 'verify_users', 'users', 'verify')
ON CONFLICT (role, permission) DO NOTHING;

-- Create user role assignments table for tracking role assignments
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('casual', 'organizer', 'venue_owner', 'admin')),
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  verification_notes TEXT,
  UNIQUE(user_id, role)
);

-- Function to get user's active roles
CREATE OR REPLACE FUNCTION public.get_user_roles(p_user_id UUID)
RETURNS TABLE(role TEXT, is_primary BOOLEAN, assigned_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  RETURN QUERY
  SELECT ur.role, ur.is_primary, ur.assigned_at
  FROM public.user_roles ur
  WHERE ur.user_id = p_user_id 
    AND ur.is_active = true
  ORDER BY ur.is_primary DESC, ur.assigned_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.user_has_role(p_user_id UUID, p_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id 
      AND role = p_role 
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id UUID, p_permission TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = p_user_id 
      AND ur.is_active = true
      AND rp.permission = p_permission
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID)
RETURNS TABLE(permission TEXT, resource TEXT, action TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT rp.permission, rp.resource, rp.action
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON ur.role = rp.role
  WHERE ur.user_id = p_user_id 
    AND ur.is_active = true
  ORDER BY rp.resource, rp.action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign role to user
CREATE OR REPLACE FUNCTION public.assign_user_role(
  p_user_id UUID, 
  p_role TEXT, 
  p_assigned_by UUID DEFAULT NULL,
  p_is_primary BOOLEAN DEFAULT false
)
RETURNS BOOLEAN AS $$
DECLARE
  role_exists BOOLEAN;
BEGIN
  -- Check if user already has this role
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id AND role = p_role
  ) INTO role_exists;
  
  IF role_exists THEN
    -- Update existing role to active
    UPDATE public.user_roles 
    SET is_active = true, 
        assigned_by = p_assigned_by,
        assigned_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id AND role = p_role;
  ELSE
    -- Insert new role
    INSERT INTO public.user_roles (user_id, role, assigned_by, is_primary)
    VALUES (p_user_id, p_role, p_assigned_by, p_is_primary);
  END IF;
  
  -- If this is set as primary, unset other primary roles
  IF p_is_primary THEN
    UPDATE public.user_roles 
    SET is_primary = false, updated_at = NOW()
    WHERE user_id = p_user_id AND role != p_role;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove role from user
CREATE OR REPLACE FUNCTION public.remove_user_role(p_user_id UUID, p_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Don't allow removing the last role
  IF (SELECT COUNT(*) FROM public.user_roles WHERE user_id = p_user_id AND is_active = true) <= 1 THEN
    RAISE EXCEPTION 'Cannot remove the last active role from user';
  END IF;
  
  -- Deactivate the role
  UPDATE public.user_roles 
  SET is_active = false, updated_at = NOW()
  WHERE user_id = p_user_id AND role = p_role;
  
  -- If this was the primary role, set another role as primary
  IF (SELECT is_primary FROM public.user_roles WHERE user_id = p_user_id AND role = p_role) THEN
    UPDATE public.user_roles 
    SET is_primary = true, updated_at = NOW()
    WHERE user_id = p_user_id 
      AND is_active = true 
      AND role != p_role
    AND id = (
      SELECT id FROM public.user_roles 
      WHERE user_id = p_user_id 
        AND is_active = true 
        AND role != p_role 
      ORDER BY assigned_at ASC 
      LIMIT 1
    );
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migrate existing single roles to multi-role system
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  -- For each profile with a role, create a user_roles entry
  FOR profile_record IN 
    SELECT id, role FROM public.profiles WHERE role IS NOT NULL
  LOOP
    -- Insert the role into user_roles table
    INSERT INTO public.user_roles (user_id, role, is_primary, is_active)
    VALUES (profile_record.id, profile_record.role, true, true)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END $$;

-- Create RLS policies for user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all roles
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can manage all roles
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create RLS policies for role_permissions table
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Everyone can read role permissions
CREATE POLICY "Everyone can read role permissions" ON public.role_permissions
  FOR SELECT USING (true);

-- Create RLS policies for user_role_assignments table
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;

-- Users can view their own role assignments
CREATE POLICY "Users can view their own role assignments" ON public.user_role_assignments
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all role assignments
CREATE POLICY "Admins can view all role assignments" ON public.user_role_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can manage all role assignments
CREATE POLICY "Admins can manage all role assignments" ON public.user_role_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create a view for easy role management
CREATE OR REPLACE VIEW public.user_role_summary AS
SELECT 
  p.id as user_id,
  p.username,
  p.full_name,
  p.email,
  array_agg(ur.role ORDER BY ur.is_primary DESC, ur.assigned_at ASC) as roles,
  array_agg(ur.role ORDER BY ur.is_primary DESC, ur.assigned_at ASC) FILTER (WHERE ur.is_primary = true) as primary_roles,
  count(ur.role) as total_roles
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id AND ur.is_active = true
GROUP BY p.id, p.username, p.full_name, p.email;

-- Grant necessary permissions
GRANT SELECT ON public.user_role_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_role(UUID, TEXT, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_role(UUID, TEXT) TO authenticated;
