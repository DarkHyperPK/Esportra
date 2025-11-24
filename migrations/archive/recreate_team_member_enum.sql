-- Recreate team_member_role enum with all required values
-- Run this in your Supabase SQL editor

-- First, let's see what the current enum looks like
SELECT unnest(enum_range(NULL::team_member_role)) as current_values;

-- Create a new enum with all the values we need
CREATE TYPE team_member_role_new AS ENUM ('owner', 'captain', 'member', 'player');

-- Update the team_members table to use the new enum
ALTER TABLE public.team_members 
ALTER COLUMN role TYPE team_member_role_new USING role::text::team_member_role_new;

-- Drop the old enum and rename the new one
DROP TYPE team_member_role;
ALTER TYPE team_member_role_new RENAME TO team_member_role;

-- Verify the enum now includes all values
SELECT unnest(enum_range(NULL::team_member_role)) as enum_values;
