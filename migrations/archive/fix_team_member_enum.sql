-- Fix team_member_role enum to include 'player'
-- Run this in your Supabase SQL editor

-- First, let's check what enum values currently exist
-- This will show us the current enum values
SELECT unnest(enum_range(NULL::team_member_role)) as enum_values;

-- Add 'player' to the existing team_member_role enum
ALTER TYPE team_member_role ADD VALUE IF NOT EXISTS 'player';

-- Verify the enum now includes all values
SELECT unnest(enum_range(NULL::team_member_role)) as enum_values;

-- Also update the team_members table constraint to use the enum
ALTER TABLE public.team_members 
DROP CONSTRAINT IF EXISTS team_members_role_check;

-- The constraint should now work with the updated enum
-- The enum will automatically handle the validation
