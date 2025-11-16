-- Fix team_member roles and add admin restrictions
-- Run this in your Supabase SQL editor

-- Update team_members table to allow 'player' role
ALTER TABLE public.team_members 
DROP CONSTRAINT IF EXISTS team_members_role_check;

ALTER TABLE public.team_members 
ADD CONSTRAINT team_members_role_check 
CHECK (role IN ('owner', 'captain', 'member', 'player'));

-- Add admin restriction check
-- Admins cannot be team members (they can only create/manage teams)
CREATE OR REPLACE FUNCTION check_admin_team_restriction()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user is an admin
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.user_id AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Admins cannot join teams as members. They can only create and manage teams.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce admin restriction
DROP TRIGGER IF EXISTS admin_team_restriction_trigger ON public.team_members;
CREATE TRIGGER admin_team_restriction_trigger
  BEFORE INSERT ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION check_admin_team_restriction();

-- Also prevent admins from being invited to teams
CREATE OR REPLACE FUNCTION check_admin_invite_restriction()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user being invited is an admin
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.user_id AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Cannot invite admins to teams. Admins can only create and manage teams.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent admin invites
DROP TRIGGER IF EXISTS admin_invite_restriction_trigger ON public.team_invites;
CREATE TRIGGER admin_invite_restriction_trigger
  BEFORE INSERT ON public.team_invites
  FOR EACH ROW
  EXECUTE FUNCTION check_admin_invite_restriction();
