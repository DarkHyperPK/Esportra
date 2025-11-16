-- =====================================================
-- COMPREHENSIVE DATABASE AUDIT REPORT
-- =====================================================
-- This script analyzes the current database state and functionality support

-- 1. TABLE EXISTENCE CHECK
-- =====================================================
SELECT '=== TABLE EXISTENCE AUDIT ===' as section;

WITH required_tables AS (
  SELECT unnest(ARRAY[
    'profiles', 'teams', 'team_members', 'team_invites', 
    'tournaments', 'tournament_participants', 'tournament_matches',
    'venues', 'venue_bookings', 'verification_requests', 
    'notifications', 'admin_roles', 'admin_permissions', 
    'admin_role_permissions', 'admin_user_roles', 
    'system_settings', 'audit_logs'
  ]) as table_name
),
existing_tables AS (
  SELECT table_name
  FROM information_schema.tables 
  WHERE table_schema = 'public'
)
SELECT 
  rt.table_name,
  CASE 
    WHEN et.table_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status,
  CASE 
    WHEN et.table_name IS NOT NULL THEN 'Ready for use'
    ELSE 'Needs to be created'
  END as functionality_status
FROM required_tables rt
LEFT JOIN existing_tables et ON rt.table_name = et.table_name
ORDER BY rt.table_name;

-- 2. COLUMN STRUCTURE AUDIT
-- =====================================================
SELECT '=== COLUMN STRUCTURE AUDIT ===' as section;

-- Check profiles table structure
SELECT 'PROFILES TABLE COLUMNS:' as table_name, '' as column_name, '' as data_type, '' as nullable, '' as status
UNION ALL
SELECT 
  'profiles' as table_name,
  column_name,
  data_type,
  is_nullable,
  CASE 
    WHEN column_name IN ('id', 'username', 'email', 'role', 'created_at', 'updated_at') THEN '✅ CORE'
    WHEN column_name IN ('is_admin', 'admin_roles', 'admin_permissions') THEN '✅ ADMIN'
    ELSE '⚠️ OPTIONAL'
  END as status
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY table_name, column_name;

-- Check tournaments table structure
SELECT 'TOURNAMENTS TABLE COLUMNS:' as table_name, '' as column_name, '' as data_type, '' as nullable, '' as status
UNION ALL
SELECT 
  'tournaments' as table_name,
  column_name,
  data_type,
  is_nullable,
  CASE 
    WHEN column_name IN ('id', 'name', 'game', 'start_date', 'end_date', 'status', 'owner_id') THEN '✅ CORE'
    WHEN column_name IN ('venue_id', 'prize_pool', 'entry_fee') THEN '✅ FEATURES'
    ELSE '⚠️ OPTIONAL'
  END as status
FROM information_schema.columns 
WHERE table_name = 'tournaments' AND table_schema = 'public'
ORDER BY table_name, column_name;

-- Check venues table structure
SELECT 'VENUES TABLE COLUMNS:' as table_name, '' as column_name, '' as data_type, '' as nullable, '' as status
UNION ALL
SELECT 
  'venues' as table_name,
  column_name,
  data_type,
  is_nullable,
  CASE 
    WHEN column_name IN ('id', 'name', 'address', 'city', 'owner_id') THEN '✅ CORE'
    WHEN column_name IN ('capacity', 'amenities', 'is_verified') THEN '✅ FEATURES'
    ELSE '⚠️ OPTIONAL'
  END as status
FROM information_schema.columns 
WHERE table_name = 'venues' AND table_schema = 'public'
ORDER BY table_name, column_name;

-- 3. FOREIGN KEY RELATIONSHIPS AUDIT
-- =====================================================
SELECT '=== FOREIGN KEY RELATIONSHIPS AUDIT ===' as section;

SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name,
  CASE 
    WHEN tc.constraint_name IS NOT NULL THEN '✅ LINKED'
    ELSE '❌ NOT LINKED'
  END as relationship_status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('profiles', 'teams', 'tournaments', 'venues', 'venue_bookings', 'tournament_participants')
ORDER BY tc.table_name, kcu.column_name;

-- 4. ROW LEVEL SECURITY AUDIT
-- =====================================================
SELECT '=== ROW LEVEL SECURITY AUDIT ===' as section;

SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity = true THEN '🔒 ENABLED'
    ELSE '🔓 DISABLED'
  END as security_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'teams', 'tournaments', 'venues', 'venue_bookings', 'tournament_participants')
ORDER BY tablename;

-- 5. INDEX PERFORMANCE AUDIT
-- =====================================================
SELECT '=== INDEX PERFORMANCE AUDIT ===' as section;

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef,
  CASE 
    WHEN indexname LIKE 'idx_%' THEN '✅ CUSTOM'
    WHEN indexname LIKE '%_pkey' THEN '✅ PRIMARY'
    ELSE '⚠️ DEFAULT'
  END as index_type
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'teams', 'tournaments', 'venues', 'venue_bookings', 'tournament_participants')
ORDER BY tablename, indexname;

-- 6. DATA POPULATION AUDIT
-- =====================================================
SELECT '=== DATA POPULATION AUDIT ===' as section;

SELECT 
  'profiles' as table_name,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ HAS DATA'
    ELSE '❌ EMPTY'
  END as data_status
FROM public.profiles
UNION ALL
SELECT 
  'teams' as table_name,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ HAS DATA'
    ELSE '❌ EMPTY'
  END as data_status
FROM public.teams
UNION ALL
SELECT 
  'tournaments' as table_name,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ HAS DATA'
    ELSE '❌ EMPTY'
  END as data_status
FROM public.tournaments
UNION ALL
SELECT 
  'venues' as table_name,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ HAS DATA'
    ELSE '❌ EMPTY'
  END as data_status
FROM public.venues
UNION ALL
SELECT 
  'venue_bookings' as table_name,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ HAS DATA'
    ELSE '❌ EMPTY'
  END as data_status
FROM public.venue_bookings
UNION ALL
SELECT 
  'tournament_participants' as table_name,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ HAS DATA'
    ELSE '❌ EMPTY'
  END as data_status
FROM public.tournament_participants
ORDER BY table_name;

-- 7. FUNCTIONALITY SUPPORT MATRIX
-- =====================================================
SELECT '=== FUNCTIONALITY SUPPORT MATRIX ===' as section;

WITH functionality_check AS (
  SELECT 
    'User Authentication' as functionality,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') 
         THEN '✅ SUPPORTED' ELSE '❌ NOT SUPPORTED' END as status,
    'profiles table exists' as requirement
  UNION ALL
  SELECT 
    'Team Management',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams' AND table_schema = 'public') 
         THEN '✅ SUPPORTED' ELSE '❌ NOT SUPPORTED' END,
    'teams table exists'
  UNION ALL
  SELECT 
    'Tournament Creation',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournaments' AND table_schema = 'public') 
         THEN '✅ SUPPORTED' ELSE '❌ NOT SUPPORTED' END,
    'tournaments table exists'
  UNION ALL
  SELECT 
    'Tournament Registration',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournament_participants' AND table_schema = 'public') 
         THEN '✅ SUPPORTED' ELSE '❌ NOT SUPPORTED' END,
    'tournament_participants table exists'
  UNION ALL
  SELECT 
    'Venue Management',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venues' AND table_schema = 'public') 
         THEN '✅ SUPPORTED' ELSE '❌ NOT SUPPORTED' END,
    'venues table exists'
  UNION ALL
  SELECT 
    'Venue Booking',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_bookings' AND table_schema = 'public') 
         THEN '✅ SUPPORTED' ELSE '❌ NOT SUPPORTED' END,
    'venue_bookings table exists'
  UNION ALL
  SELECT 
    'Admin System',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_roles' AND table_schema = 'public') 
         THEN '✅ SUPPORTED' ELSE '❌ NOT SUPPORTED' END,
    'admin_roles table exists'
  UNION ALL
  SELECT 
    'Verification System',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verification_requests' AND table_schema = 'public') 
         THEN '✅ SUPPORTED' ELSE '❌ NOT SUPPORTED' END,
    'verification_requests table exists'
  UNION ALL
  SELECT 
    'Notifications',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') 
         THEN '✅ SUPPORTED' ELSE '❌ NOT SUPPORTED' END,
    'notifications table exists'
  UNION ALL
  SELECT 
    'Audit Logging',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs' AND table_schema = 'public') 
         THEN '✅ SUPPORTED' ELSE '❌ NOT SUPPORTED' END,
    'audit_logs table exists'
)
SELECT 
  functionality,
  status,
  requirement
FROM functionality_check
ORDER BY 
  CASE 
    WHEN status = '✅ SUPPORTED' THEN 1
    WHEN status = '❌ NOT SUPPORTED' THEN 2
    ELSE 3
  END,
  functionality;

-- 8. RECOMMENDATIONS
-- =====================================================
SELECT '=== RECOMMENDATIONS ===' as section;

SELECT 
  'Database Setup Priority' as category,
  '1. Create missing core tables (profiles, tournaments, venues)' as recommendation,
  'HIGH' as priority
UNION ALL
SELECT 
  'Database Setup Priority',
  '2. Add foreign key relationships for data integrity',
  'HIGH'
UNION ALL
SELECT 
  'Database Setup Priority',
  '3. Create admin system tables for role management',
  'MEDIUM'
UNION ALL
SELECT 
  'Database Setup Priority',
  '4. Add RLS policies for security',
  'MEDIUM'
UNION ALL
SELECT 
  'Database Setup Priority',
  '5. Create indexes for performance optimization',
  'LOW'
UNION ALL
SELECT 
  'Database Setup Priority',
  '6. Populate with sample data for testing',
  'LOW';

-- 9. SUMMARY
-- =====================================================
SELECT '=== AUDIT SUMMARY ===' as section;

SELECT 
  'Total Required Tables' as metric,
  '17' as count,
  '100%' as percentage
UNION ALL
SELECT 
  'Existing Tables',
  (SELECT COUNT(*)::text FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('profiles', 'teams', 'team_members', 'team_invites', 'tournaments', 'tournament_participants', 'tournament_matches', 'venues', 'venue_bookings', 'verification_requests', 'notifications', 'admin_roles', 'admin_permissions', 'admin_role_permissions', 'admin_user_roles', 'system_settings', 'audit_logs')),
  ROUND((SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('profiles', 'teams', 'team_members', 'team_invites', 'tournaments', 'tournament_participants', 'tournament_matches', 'venues', 'venue_bookings', 'verification_requests', 'notifications', 'admin_roles', 'admin_permissions', 'admin_role_permissions', 'admin_user_roles', 'system_settings', 'audit_logs')) * 100.0 / 17, 1) || '%'
UNION ALL
SELECT 
  'Core Functionality Ready',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournaments' AND table_schema = 'public')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venues' AND table_schema = 'public')
    THEN 'YES'
    ELSE 'NO'
  END,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournaments' AND table_schema = 'public')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venues' AND table_schema = 'public')
    THEN '100%'
    ELSE '0%'
  END;
