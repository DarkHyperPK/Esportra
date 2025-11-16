-- Fix team_member_role enum to include 'player'
-- Run this in your Supabase SQL editor

-- Add 'player' to the existing team_member_role enum
ALTER TYPE team_member_role ADD VALUE IF NOT EXISTS 'player';

-- Verify the enum now includes all values
SELECT unnest(enum_range(NULL::team_member_role)) as enum_values;
