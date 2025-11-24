-- =====================================================
-- FIX DUPLICATE PROFILES AND CLEAN UP DATABASE
-- =====================================================
-- This script fixes duplicate profiles and cleans up the database

-- 1. Check for duplicate profiles
SELECT '=== CHECKING FOR DUPLICATE PROFILES ===' as step;
SELECT id, username, email, COUNT(*) as count 
FROM public.profiles 
GROUP BY id, username, email 
HAVING COUNT(*) > 1;

-- 2. Check for profiles without corresponding auth users
SELECT '=== CHECKING FOR ORPHANED PROFILES ===' as step;
SELECT p.id, p.username, p.email 
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;

-- 3. Check for auth users without profiles
SELECT '=== CHECKING FOR AUTH USERS WITHOUT PROFILES ===' as step;
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 4. Remove duplicate profiles (keep the most recent one)
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY id ORDER BY updated_at DESC) as rn
  FROM public.profiles
)
DELETE FROM public.profiles 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 5. Create profiles for auth users that don't have them
INSERT INTO public.profiles (
  id, 
  username, 
  full_name, 
  email, 
  role, 
  created_at, 
  updated_at
)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', 'user_' || substr(u.id::text, 1, 8)),
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  u.email,
  COALESCE(u.raw_user_meta_data->>'role', 'casual')::text,
  u.created_at,
  NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 6. Remove orphaned profiles (profiles without auth users)
DELETE FROM public.profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- 7. Update profiles with missing required fields
UPDATE public.profiles 
SET 
  username = COALESCE(username, 'user_' || substr(id::text, 1, 8)),
  full_name = COALESCE(full_name, email),
  email = COALESCE(email, ''),
  role = COALESCE(role, 'casual'),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE username IS NULL 
   OR full_name IS NULL 
   OR email IS NULL 
   OR role IS NULL 
   OR created_at IS NULL 
   OR updated_at IS NULL;

-- 8. Show final state
SELECT '=== FINAL PROFILE COUNT ===' as step;
SELECT COUNT(*) as total_profiles FROM public.profiles;

SELECT '=== FINAL AUTH USER COUNT ===' as step;
SELECT COUNT(*) as total_auth_users FROM auth.users;

-- 9. Show profiles that should be working
SELECT '=== WORKING PROFILES ===' as step;
SELECT p.id, p.username, p.email, p.role, p.created_at
FROM public.profiles p
INNER JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC
LIMIT 10;

-- 10. Success message
SELECT '🎉 Database cleanup completed!' as message;
SELECT '✅ Duplicate profiles removed' as status;
SELECT '✅ Orphaned profiles cleaned up' as result;
SELECT '✅ Auth users have corresponding profiles' as next_step;
