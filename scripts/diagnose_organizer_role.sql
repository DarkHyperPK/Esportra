-- Diagnostic script to check organizer role status for a user
-- Replace 'USER_ID_HERE' with the actual user ID

-- Check user_roles table
SELECT 
  'user_roles' as table_name,
  user_id,
  role,
  is_active,
  assigned_at,
  updated_at
FROM public.user_roles
WHERE user_id = 'USER_ID_HERE'::uuid
  AND role = 'organizer';

-- Check verified_roles table
SELECT 
  'verified_roles' as table_name,
  user_id,
  role,
  status,
  is_active,
  verified_at,
  verified_by,
  expires_at,
  updated_at
FROM public.verified_roles
WHERE user_id = 'USER_ID_HERE'::uuid
  AND role = 'organizer';

-- Check verification_requests table
SELECT 
  'verification_requests' as table_name,
  user_id,
  requested_role,
  status,
  submitted_at,
  reviewed_at,
  reviewed_by,
  rejection_reason
FROM public.verification_requests
WHERE user_id = 'USER_ID_HERE'::uuid
  AND requested_role = 'organizer'
ORDER BY submitted_at DESC;

-- Check profiles table for admin status
SELECT 
  'profiles' as table_name,
  id,
  username,
  full_name,
  is_admin,
  admin_roles,
  role as base_role
FROM public.profiles
WHERE id = 'USER_ID_HERE'::uuid;

