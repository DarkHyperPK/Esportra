-- =====================================================
-- FRONTEND DATABASE COMPATIBILITY CHECK
-- =====================================================
-- This script checks if the database supports all frontend functionality
-- Based on the frontend analysis report

-- 1. CHECK CORE TABLES EXISTENCE
-- =====================================================
SELECT '=== CORE TABLES EXISTENCE CHECK ===' as section;

WITH required_tables AS (
  SELECT unnest(ARRAY[
    'profiles',
    'teams', 
    'team_members',
    'team_invites',
    'tournaments',
    'tournament_participants',
    'tournament_registrations',
    'venues',
    'venue_bookings',
    'admin_roles',
    'admin_permissions', 
    'admin_role_permissions',
    'admin_user_roles',
    'verification_requests',
    'notifications',
    'audit_logs',
    'system_settings'
  ]) as table_name
),
existing_tables AS (
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
)
SELECT 
  rt.table_name,
  CASE 
    WHEN et.table_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status,
  CASE 
    WHEN et.table_name IS NOT NULL THEN 'Ready for frontend'
    ELSE 'Frontend will fail - table missing'
  END as impact
FROM required_tables rt
LEFT JOIN existing_tables et ON rt.table_name = et.table_name
ORDER BY rt.table_name;

-- 2. CHECK AUTHENTICATION SYSTEM SUPPORT
-- =====================================================
SELECT '=== AUTHENTICATION SYSTEM CHECK ===' as section;

-- Check profiles table structure for auth
SELECT 
  'profiles table' as component,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      AND column_name IN ('id', 'username', 'email', 'role', 'is_admin', 'admin_roles', 'admin_permissions')
    ) THEN '✅ SUPPORTED'
    ELSE '❌ MISSING COLUMNS'
  END as auth_support,
  'Sign up, sign in, profile management' as functionality
UNION ALL
SELECT 
  'Supabase Auth',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'auth') 
    THEN '✅ SUPPORTED'
    ELSE '❌ MISSING'
  END,
  'User authentication and session management'
UNION ALL
SELECT 
  'Profile Creation',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      AND column_name = 'id' 
      AND is_nullable = 'NO'
    ) THEN '✅ SUPPORTED'
    ELSE '❌ MISSING'
  END,
  'Profile creation on signup with upsert';

-- 3. CHECK TEAM MANAGEMENT SYSTEM SUPPORT
-- =====================================================
SELECT '=== TEAM MANAGEMENT SYSTEM CHECK ===' as section;

SELECT 
  'teams table' as component,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'teams' 
      AND column_name IN ('id', 'name', 'tag', 'game', 'logo_url', 'description', 'owner_id')
    ) THEN '✅ SUPPORTED'
    ELSE '❌ MISSING COLUMNS'
  END as team_support,
  'Team creation, editing, management' as functionality
UNION ALL
SELECT 
  'team_members table',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'team_members' 
      AND column_name IN ('team_id', 'user_id', 'role', 'joined_at', 'is_active')
    ) THEN '✅ SUPPORTED'
    ELSE '❌ MISSING COLUMNS'
  END,
  'Team member management and roles'
UNION ALL
SELECT 
  'team_invites table',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'team_invites' 
      AND column_name IN ('team_id', 'user_id', 'invited_by', 'status', 'message')
    ) THEN '✅ SUPPORTED'
    ELSE '❌ MISSING COLUMNS'
  END,
  'Team invitation system';

-- 4. CHECK TOURNAMENT SYSTEM SUPPORT
-- =====================================================
SELECT '=== TOURNAMENT SYSTEM CHECK ===' as section;

SELECT 
  'tournaments table' as component,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tournaments' 
      AND column_name IN ('id', 'name', 'game', 'format', 'start_date', 'end_date', 'max_teams', 'team_size', 'prize_pool', 'entry_fee', 'owner_id', 'venue_id', 'status')
    ) THEN '✅ SUPPORTED'
    ELSE '❌ MISSING COLUMNS'
  END as tournament_support,
  'Tournament creation and management' as functionality
UNION ALL
SELECT 
  'tournament_participants table',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tournament_participants' 
      AND column_name IN ('tournament_id', 'user_id', 'team_id', 'registration_type', 'status')
    ) THEN '✅ SUPPORTED'
    ELSE '❌ MISSING COLUMNS'
  END,
  'Tournament registration system'
UNION ALL
SELECT 
  'tournament_registrations table',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tournament_registrations' 
      AND column_name IN ('tournament_id', 'user_id', 'registration_type', 'gamer_tag', 'team_name', 'status')
    ) THEN '✅ SUPPORTED'
    ELSE '❌ MISSING COLUMNS'
  END,
  'Detailed registration information';

-- 5. CHECK VENUE MANAGEMENT SYSTEM SUPPORT
-- =====================================================
SELECT '=== VENUE MANAGEMENT SYSTEM CHECK ===' as section;

SELECT 
  'venues table' as component,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'venues' 
      AND column_name IN ('id', 'name', 'address', 'city', 'capacity', 'amenities', 'owner_id', 'is_verified', 'contact_email', 'contact_phone')
    ) THEN '✅ SUPPORTED'
    ELSE '❌ MISSING COLUMNS'
  END as venue_support,
  'Venue creation and management' as functionality
UNION ALL
SELECT 
  'venue_bookings table',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'venue_bookings' 
      AND column_name IN ('venue_id', 'user_id', 'booking_date', 'booking_time', 'duration_hours', 'status', 'amount')
    ) THEN '✅ SUPPORTED'
    ELSE '❌ MISSING COLUMNS'
  END,
  'Venue booking system';

-- 6. CHECK ADMIN SYSTEM SUPPORT
-- =====================================================
SELECT '=== ADMIN SYSTEM CHECK ===' as section;

SELECT 
  'admin_roles table' as component,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'admin_roles' 
      AND column_name IN ('id', 'name', 'description')
    ) THEN '✅ SUPPORTED'
    ELSE '❌ MISSING COLUMNS'
  END as admin_support,
  'Admin role definitions' as functionality
UNION ALL
SELECT 
  'admin_permissions table',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'admin_permissions' 
      AND column_name IN ('id', 'key', 'name', 'description', 'resource', 'action')
    ) THEN '✅ SUPPORTED'
    ELSE '❌ MISSING COLUMNS'
  END,
  'Permission definitions'
UNION ALL
SELECT 
  'admin_role_permissions table',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'admin_role_permissions' 
      AND column_name IN ('role_id', 'permission_id')
    ) THEN '✅ SUPPORTED'
    ELSE '❌ MISSING COLUMNS'
  END,
  'Role-permission mapping'
UNION ALL
SELECT 
  'admin_user_roles table',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'admin_user_roles' 
      AND column_name IN ('user_id', 'role_id', 'assigned_by')
    ) THEN '✅ SUPPORTED'
    ELSE '❌ MISSING COLUMNS'
  END,
  'User role assignments'
UNION ALL
SELECT 
  'audit_logs table',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'audit_logs' 
      AND column_name IN ('user_id', 'action', 'target_type', 'details', 'created_at')
    ) THEN '✅ SUPPORTED'
    ELSE '❌ MISSING COLUMNS'
  END,
  'Admin audit trail'
UNION ALL
SELECT 
  'system_settings table',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'system_settings' 
      AND column_name IN ('key', 'value', 'description')
    ) THEN '✅ SUPPORTED'
    ELSE '❌ MISSING COLUMNS'
  END,
  'System configuration';

-- 7. CHECK VERIFICATION SYSTEM SUPPORT
-- =====================================================
SELECT '=== VERIFICATION SYSTEM CHECK ===' as section;

SELECT 
  'verification_requests table' as component,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'verification_requests' 
      AND column_name IN ('id', 'user_id', 'requested_role', 'business_info', 'documents', 'status', 'reviewed_by', 'reviewed_at')
    ) THEN '✅ SUPPORTED'
    ELSE '❌ MISSING COLUMNS'
  END as verification_support,
  'Document upload and verification workflow' as functionality;

-- 8. CHECK NOTIFICATION SYSTEM SUPPORT
-- =====================================================
SELECT '=== NOTIFICATION SYSTEM CHECK ===' as section;

SELECT 
  'notifications table' as component,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      AND column_name IN ('id', 'user_id', 'title', 'message', 'type', 'is_read', 'action_url', 'created_at')
    ) THEN '✅ SUPPORTED'
    ELSE '❌ MISSING COLUMNS'
  END as notification_support,
  'Real-time notifications and team invites' as functionality;

-- 9. CHECK FOREIGN KEY RELATIONSHIPS
-- =====================================================
SELECT '=== FOREIGN KEY RELATIONSHIPS CHECK ===' as section;

SELECT 
  'profiles foreign keys' as relationship,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'profiles' 
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'id'
    ) THEN '✅ SUPPORTED'
    ELSE '❌ MISSING'
  END as status,
  'All tables depend on profiles.id' as description
UNION ALL
SELECT 
  'teams -> profiles',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'teams' 
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'owner_id'
    ) THEN '✅ SUPPORTED'
    ELSE '❌ MISSING'
  END,
  'Teams must reference valid user'
UNION ALL
SELECT 
  'tournaments -> profiles',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'tournaments' 
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'owner_id'
    ) THEN '✅ SUPPORTED'
    ELSE '❌ MISSING'
  END,
  'Tournaments must reference valid user'
UNION ALL
SELECT 
  'venues -> profiles',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'venues' 
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'owner_id'
    ) THEN '✅ SUPPORTED'
    ELSE '❌ MISSING'
  END,
  'Venues must reference valid user';

-- 10. CHECK RLS POLICIES
-- =====================================================
SELECT '=== ROW LEVEL SECURITY CHECK ===' as section;

SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as rls_status,
  CASE 
    WHEN rowsecurity = true THEN 'Secure - users can only access their data'
    ELSE 'INSECURE - users can access all data'
  END as security_impact
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'teams', 'tournaments', 'venues', 'venue_bookings', 'tournament_participants')
ORDER BY tablename;

-- 11. CHECK INDEXES FOR PERFORMANCE
-- =====================================================
SELECT '=== PERFORMANCE INDEXES CHECK ===' as section;

SELECT 
  'profiles indexes' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public'
      AND tablename = 'profiles' 
      AND indexname LIKE '%email%'
    ) THEN '✅ EMAIL INDEXED'
    ELSE '❌ MISSING EMAIL INDEX'
  END as index_status,
  'Critical for user lookup' as importance
UNION ALL
SELECT 
  'teams indexes',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public'
      AND tablename = 'teams' 
      AND indexname LIKE '%owner_id%'
    ) THEN '✅ OWNER INDEXED'
    ELSE '❌ MISSING OWNER INDEX'
  END,
  'Critical for team queries'
UNION ALL
SELECT 
  'tournaments indexes',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public'
      AND tablename = 'tournaments' 
      AND indexname LIKE '%owner_id%'
    ) THEN '✅ OWNER INDEXED'
    ELSE '❌ MISSING OWNER INDEX'
  END,
  'Critical for tournament queries'
UNION ALL
SELECT 
  'venues indexes',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public'
      AND tablename = 'venues' 
      AND indexname LIKE '%city%'
    ) THEN '✅ CITY INDEXED'
    ELSE '❌ MISSING CITY INDEX'
  END,
  'Critical for venue search';

-- 12. OVERALL COMPATIBILITY SUMMARY
-- =====================================================
SELECT '=== OVERALL COMPATIBILITY SUMMARY ===' as section;

WITH table_check AS (
  SELECT COUNT(*) as existing_tables
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'teams', 'team_members', 'team_invites', 'tournaments', 'tournament_participants', 'tournament_registrations', 'venues', 'venue_bookings', 'admin_roles', 'admin_permissions', 'admin_role_permissions', 'admin_user_roles', 'verification_requests', 'notifications', 'audit_logs', 'system_settings')
),
column_check AS (
  SELECT COUNT(*) as tables_with_required_columns
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
  AND t.table_name IN ('profiles', 'teams', 'tournaments', 'venues')
  AND EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_name = t.table_name
    AND c.table_schema = 'public'
    AND (
      (t.table_name = 'profiles' AND c.column_name IN ('id', 'username', 'email', 'role', 'is_admin'))
      OR (t.table_name = 'teams' AND c.column_name IN ('id', 'name', 'tag', 'game', 'owner_id'))
      OR (t.table_name = 'tournaments' AND c.column_name IN ('id', 'name', 'game', 'start_date', 'end_date', 'owner_id'))
      OR (t.table_name = 'venues' AND c.column_name IN ('id', 'name', 'address', 'city', 'owner_id'))
    )
  )
)
SELECT 
  'Database Readiness' as metric,
  CASE 
    WHEN tc.existing_tables >= 15 THEN '✅ READY'
    WHEN tc.existing_tables >= 10 THEN '⚠️ PARTIALLY READY'
    ELSE '❌ NOT READY'
  END as status,
  CONCAT(tc.existing_tables, '/17 tables exist') as details
FROM table_check tc
UNION ALL
SELECT 
  'Frontend Compatibility',
  CASE 
    WHEN cc.tables_with_required_columns >= 4 THEN '✅ COMPATIBLE'
    WHEN cc.tables_with_required_columns >= 2 THEN '⚠️ PARTIALLY COMPATIBLE'
    ELSE '❌ INCOMPATIBLE'
  END,
  CONCAT(cc.tables_with_required_columns, '/4 core tables have required columns')
FROM column_check cc
UNION ALL
SELECT 
  'Next Steps',
  CASE 
    WHEN tc.existing_tables >= 15 THEN 'Test frontend functionality'
    WHEN tc.existing_tables >= 10 THEN 'Create missing tables'
    ELSE 'Run complete database setup'
  END,
  'Follow recommendations based on status'
FROM table_check tc;
