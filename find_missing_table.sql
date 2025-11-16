-- =====================================================
-- FIND MISSING TABLE
-- =====================================================
-- This query will show you exactly which table is missing

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
  rt.table_name as required_table,
  CASE 
    WHEN et.table_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status,
  CASE 
    WHEN et.table_name IS NOT NULL THEN 'Ready'
    ELSE 'NEEDS TO BE CREATED'
  END as action_needed
FROM required_tables rt
LEFT JOIN existing_tables et ON rt.table_name = et.table_name
ORDER BY 
  CASE WHEN et.table_name IS NULL THEN 0 ELSE 1 END,  -- Missing tables first
  rt.table_name;
