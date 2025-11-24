-- Simple test to check if RLS policies are working
-- Run this in Supabase SQL Editor

-- Test 1: Check if we can select from profiles
SELECT COUNT(*) FROM public.profiles;

-- Test 2: Check if we can select from teams
SELECT COUNT(*) FROM public.teams;

-- Test 3: Check if we can select from tournaments
SELECT COUNT(*) FROM public.tournaments;

-- Test 4: Check if we can select from team_members
SELECT COUNT(*) FROM public.team_members;

-- Test 5: Check if we can select from team_invites
SELECT COUNT(*) FROM public.team_invites;
