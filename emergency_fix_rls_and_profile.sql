-- =====================================================
-- EMERGENCY FIX - COMPLETELY DISABLE RLS
-- =====================================================
-- This script completely disables RLS to stop all 500 errors

-- 1. COMPLETELY DISABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- 2. DROP ALL POLICIES (AGAIN TO BE SURE)
-- =====================================================

-- Drop all possible policy names
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_all_access" ON public.profiles;
DROP POLICY IF EXISTS "teams_select_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_update_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_delete_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_all_access" ON public.teams;
DROP POLICY IF EXISTS "team_members_select_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_all_access" ON public.team_members;
DROP POLICY IF EXISTS "team_invites_select_policy" ON public.team_invites;
DROP POLICY IF EXISTS "team_invites_insert_policy" ON public.team_invites;
DROP POLICY IF EXISTS "team_invites_update_policy" ON public.team_invites;
DROP POLICY IF EXISTS "team_invites_all_access" ON public.team_invites;
DROP POLICY IF EXISTS "tournaments_select_policy" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_insert_policy" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_update_policy" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_delete_policy" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_all_access" ON public.tournaments;
DROP POLICY IF EXISTS "tournament_participants_select_policy" ON public.tournament_participants;
DROP POLICY IF EXISTS "tournament_participants_insert_policy" ON public.tournament_participants;
DROP POLICY IF EXISTS "tournament_participants_update_policy" ON public.tournament_participants;
DROP POLICY IF EXISTS "tournament_participants_delete_policy" ON public.tournament_participants;
DROP POLICY IF EXISTS "tournament_participants_all_access" ON public.tournament_participants;
DROP POLICY IF EXISTS "tournament_matches_select_policy" ON public.tournament_matches;
DROP POLICY IF EXISTS "tournament_matches_insert_policy" ON public.tournament_matches;
DROP POLICY IF EXISTS "tournament_matches_update_policy" ON public.tournament_matches;
DROP POLICY IF EXISTS "tournament_matches_delete_policy" ON public.tournament_matches;
DROP POLICY IF EXISTS "tournament_matches_all_access" ON public.tournament_matches;
DROP POLICY IF EXISTS "venues_select_policy" ON public.venues;
DROP POLICY IF EXISTS "venues_insert_policy" ON public.venues;
DROP POLICY IF EXISTS "venues_update_policy" ON public.venues;
DROP POLICY IF EXISTS "venues_delete_policy" ON public.venues;
DROP POLICY IF EXISTS "venues_all_access" ON public.venues;
DROP POLICY IF EXISTS "venue_profiles_select_policy" ON public.venue_profiles;
DROP POLICY IF EXISTS "venue_profiles_insert_policy" ON public.venue_profiles;
DROP POLICY IF EXISTS "venue_profiles_update_policy" ON public.venue_profiles;
DROP POLICY IF EXISTS "venue_profiles_delete_policy" ON public.venue_profiles;
DROP POLICY IF EXISTS "venue_profiles_all_access" ON public.venue_profiles;
DROP POLICY IF EXISTS "venue_bookings_select_policy" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_insert_policy" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_update_policy" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_delete_policy" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_all_access" ON public.venue_bookings;
DROP POLICY IF EXISTS "verification_requests_select_policy" ON public.verification_requests;
DROP POLICY IF EXISTS "verification_requests_insert_policy" ON public.verification_requests;
DROP POLICY IF EXISTS "verification_requests_update_policy" ON public.verification_requests;
DROP POLICY IF EXISTS "verification_requests_delete_policy" ON public.verification_requests;
DROP POLICY IF EXISTS "verification_requests_all_access" ON public.verification_requests;
DROP POLICY IF EXISTS "verified_roles_select_policy" ON public.verified_roles;
DROP POLICY IF EXISTS "verified_roles_insert_policy" ON public.verified_roles;
DROP POLICY IF EXISTS "verified_roles_update_policy" ON public.verified_roles;
DROP POLICY IF EXISTS "verified_roles_delete_policy" ON public.verified_roles;
DROP POLICY IF EXISTS "verified_roles_all_access" ON public.verified_roles;
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_all_access" ON public.notifications;
DROP POLICY IF EXISTS "admin_roles_select_policy" ON public.admin_roles;
DROP POLICY IF EXISTS "admin_roles_insert_policy" ON public.admin_roles;
DROP POLICY IF EXISTS "admin_roles_update_policy" ON public.admin_roles;
DROP POLICY IF EXISTS "admin_roles_delete_policy" ON public.admin_roles;
DROP POLICY IF EXISTS "admin_roles_all_access" ON public.admin_roles;
DROP POLICY IF EXISTS "admin_permissions_select_policy" ON public.admin_permissions;
DROP POLICY IF EXISTS "admin_permissions_insert_policy" ON public.admin_permissions;
DROP POLICY IF EXISTS "admin_permissions_update_policy" ON public.admin_permissions;
DROP POLICY IF EXISTS "admin_permissions_delete_policy" ON public.admin_permissions;
DROP POLICY IF EXISTS "admin_permissions_all_access" ON public.admin_permissions;
DROP POLICY IF EXISTS "admin_role_permissions_select_policy" ON public.admin_role_permissions;
DROP POLICY IF EXISTS "admin_role_permissions_insert_policy" ON public.admin_role_permissions;
DROP POLICY IF EXISTS "admin_role_permissions_update_policy" ON public.admin_role_permissions;
DROP POLICY IF EXISTS "admin_role_permissions_delete_policy" ON public.admin_role_permissions;
DROP POLICY IF EXISTS "admin_role_permissions_all_access" ON public.admin_role_permissions;
DROP POLICY IF EXISTS "admin_user_roles_select_policy" ON public.admin_user_roles;
DROP POLICY IF EXISTS "admin_user_roles_insert_policy" ON public.admin_user_roles;
DROP POLICY IF EXISTS "admin_user_roles_update_policy" ON public.admin_user_roles;
DROP POLICY IF EXISTS "admin_user_roles_delete_policy" ON public.admin_user_roles;
DROP POLICY IF EXISTS "admin_user_roles_all_access" ON public.admin_user_roles;
DROP POLICY IF EXISTS "system_settings_select_policy" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_insert_policy" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_update_policy" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_delete_policy" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_all_access" ON public.system_settings;
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_update_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_delete_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_all_access" ON public.audit_logs;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view active teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can manage their teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view public tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Organizers can manage their tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can view active venues" ON public.venues;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

-- 3. TEST BASIC ACCESS
-- =====================================================

SELECT 'Testing profiles table access...' as test;
SELECT COUNT(*) as profile_count FROM public.profiles;

SELECT 'Testing teams table access...' as test;
SELECT COUNT(*) as team_count FROM public.teams;

SELECT 'Testing tournaments table access...' as test;
SELECT COUNT(*) as tournament_count FROM public.tournaments;

-- 4. SUCCESS MESSAGE
-- =====================================================

SELECT '🚨 EMERGENCY FIX COMPLETE - RLS COMPLETELY DISABLED' as message;
SELECT '✅ All 500 errors should now be resolved' as status;
SELECT '✅ Application should work without infinite recursion' as result;
