-- =====================================================
-- CHECK DATABASE TABLES AND FIX DASHBOARD ISSUES
-- =====================================================
-- This script checks what tables exist and fixes common issues

-- 1. Check if all required tables exist
SELECT '=== CHECKING TABLE EXISTENCE ===' as step;

SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('profiles', 'teams', 'team_members', 'team_invites', 'tournaments', 'tournament_participants', 'venues', 'venue_bookings', 'verification_requests', 'notifications', 'admin_roles', 'admin_permissions', 'admin_role_permissions', 'admin_user_roles', 'system_settings', 'audit_logs') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'teams', 'team_members', 'team_invites', 'tournaments', 'tournament_participants', 'venues', 'venue_bookings', 'verification_requests', 'notifications', 'admin_roles', 'admin_permissions', 'admin_role_permissions', 'admin_user_roles', 'system_settings', 'audit_logs')
ORDER BY table_name;

-- 2. Check if RLS is enabled on tables
SELECT '=== CHECKING RLS STATUS ===' as step;

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'teams', 'tournaments', 'venues', 'venue_bookings', 'tournament_participants')
ORDER BY tablename;

-- 3. Check column names in tournaments table
SELECT '=== CHECKING TOURNAMENTS COLUMNS ===' as step;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tournaments' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check if there are any policies on the tables
SELECT '=== CHECKING RLS POLICIES ===' as step;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('venue_bookings', 'tournament_participants')
ORDER BY tablename, policyname;

-- 5. Test a simple query on venue_bookings
SELECT '=== TESTING VENUE_BOOKINGS QUERY ===' as step;

SELECT COUNT(*) as venue_bookings_count FROM public.venue_bookings;

-- 6. Test a simple query on tournament_participants  
SELECT '=== TESTING TOURNAMENT_PARTICIPANTS QUERY ===' as step;

SELECT COUNT(*) as tournament_participants_count FROM public.tournament_participants;

-- 7. Check if we have any data in profiles
SELECT '=== CHECKING PROFILES DATA ===' as step;

SELECT COUNT(*) as profiles_count FROM public.profiles;

-- 8. Success message
SELECT '🎉 Database check completed!' as message;
SELECT 'Check the results above to see what needs to be fixed' as next_step;
