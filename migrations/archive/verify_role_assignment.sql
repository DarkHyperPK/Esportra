-- SQL Query to verify if a role was assigned to a user
-- Replace 'user@example.com' with the email of the user you assigned the role to

-- SIMPLE CHECK: Just check the profiles table (this is the most important)
SELECT 
  id,
  email,
  username,
  is_admin,
  admin_roles,
  admin_permissions,
  CASE 
    WHEN admin_roles IS NULL THEN 'NULL'
    WHEN array_length(admin_roles, 1) IS NULL THEN 'EMPTY ARRAY'
    ELSE 'HAS ROLES: ' || array_to_string(admin_roles, ', ')
  END as roles_status
FROM profiles
WHERE email = 'user@example.com'; -- Replace with actual email

-- Check admin_user_roles table
SELECT 
  aur.user_id,
  p.email,
  ar.name as role_name,
  LOWER(REPLACE(ar.name, ' ', '_')) as normalized_role_key,
  aur.assigned_at,
  aur.assigned_by
FROM admin_user_roles aur
JOIN profiles p ON p.id = aur.user_id
JOIN admin_roles ar ON ar.id = aur.role_id
WHERE p.email = 'user@example.com'; -- Replace with actual email

-- Check if role matches what's in admin_roles array
-- This normalizes the role name to match the format stored in admin_roles array
SELECT 
  p.email,
  p.admin_roles as profile_admin_roles,
  array_agg(LOWER(REPLACE(ar.name, ' ', '_'))) as normalized_roles_from_table
FROM profiles p
LEFT JOIN admin_user_roles aur ON aur.user_id = p.id
LEFT JOIN admin_roles ar ON ar.id = aur.role_id
WHERE p.email = 'user@example.com' -- Replace with actual email
GROUP BY p.id, p.email, p.admin_roles;

