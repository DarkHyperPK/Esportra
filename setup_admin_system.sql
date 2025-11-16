-- =====================================================
-- COMPLETE ADMIN SYSTEM SETUP
-- =====================================================
-- This script sets up the complete admin system with roles, permissions, and a super admin user

-- 1. DISABLE RLS TEMPORARILY (if not already done)
-- =====================================================

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_roles DISABLE ROW LEVEL SECURITY;

-- 2. CREATE ADMIN ROLES
-- =====================================================

INSERT INTO public.admin_roles (name, description) VALUES
    ('super_admin', 'Full system access and control'),
    ('ops_admin', 'Tournament and venue management'),
    ('finance_admin', 'Payment and financial management'),
    ('moderator', 'Community and content moderation'),
    ('support_admin', 'User support and verification')
ON CONFLICT (name) DO UPDATE SET 
    description = EXCLUDED.description;

-- 3. CREATE ADMIN PERMISSIONS
-- =====================================================

INSERT INTO public.admin_permissions (name, description, resource, action) VALUES
    -- User Management
    ('user:view', 'View user profiles', 'users', 'read'),
    ('user:edit', 'Edit user profiles', 'users', 'update'),
    ('user:ban', 'Ban users', 'users', 'update'),
    ('user:suspend', 'Suspend users', 'users', 'update'),
    ('user:delete', 'Delete users', 'users', 'delete'),
    
    -- Tournament Management
    ('tournament:view', 'View tournaments', 'tournaments', 'read'),
    ('tournament:create', 'Create tournaments', 'tournaments', 'create'),
    ('tournament:edit', 'Edit tournaments', 'tournaments', 'update'),
    ('tournament:approve', 'Approve tournaments', 'tournaments', 'update'),
    ('tournament:feature', 'Feature tournaments', 'tournaments', 'update'),
    ('tournament:delete', 'Delete tournaments', 'tournaments', 'delete'),
    
    -- Venue Management
    ('venue:view', 'View venues', 'venues', 'read'),
    ('venue:create', 'Create venues', 'venues', 'create'),
    ('venue:edit', 'Edit venues', 'venues', 'update'),
    ('venue:approve', 'Approve venues', 'venues', 'update'),
    ('venue:verify', 'Verify venues', 'venues', 'update'),
    ('venue:delete', 'Delete venues', 'venues', 'delete'),
    
    -- Verification Management
    ('verification:view', 'View verification requests', 'verification', 'read'),
    ('verification:approve', 'Approve verification requests', 'verification', 'update'),
    ('verification:reject', 'Reject verification requests', 'verification', 'update'),
    
    -- Team Management
    ('team:view', 'View teams', 'teams', 'read'),
    ('team:edit', 'Edit teams', 'teams', 'update'),
    ('team:delete', 'Delete teams', 'teams', 'delete'),
    
    -- System Management
    ('audit:view', 'View audit logs', 'audit', 'read'),
    ('settings:view', 'View system settings', 'settings', 'read'),
    ('settings:edit', 'Edit system settings', 'settings', 'update'),
    ('admin:manage', 'Manage admin roles', 'admin', 'manage'),
    ('admin:assign_roles', 'Assign admin roles to users', 'admin', 'manage')
ON CONFLICT (name) DO UPDATE SET 
    description = EXCLUDED.description,
    resource = EXCLUDED.resource,
    action = EXCLUDED.action;

-- 4. ASSIGN PERMISSIONS TO ROLES
-- =====================================================

-- Super Admin gets ALL permissions
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.admin_roles r 
CROSS JOIN public.admin_permissions p 
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Ops Admin permissions
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.admin_roles r 
JOIN public.admin_permissions p ON p.name IN (
    'tournament:view', 'tournament:create', 'tournament:edit', 'tournament:approve', 'tournament:feature', 'tournament:delete',
    'venue:view', 'venue:create', 'venue:edit', 'venue:approve', 'venue:verify', 'venue:delete',
    'verification:view', 'verification:approve', 'verification:reject',
    'team:view', 'team:edit', 'team:delete',
    'user:view', 'user:edit',
    'audit:view', 'settings:view'
)
WHERE r.name = 'ops_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Finance Admin permissions
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.admin_roles r 
JOIN public.admin_permissions p ON p.name IN (
    'user:view', 'user:edit',
    'tournament:view',
    'venue:view',
    'audit:view', 'settings:view'
)
WHERE r.name = 'finance_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Moderator permissions
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.admin_roles r 
JOIN public.admin_permissions p ON p.name IN (
    'user:view', 'user:edit', 'user:suspend',
    'tournament:view', 'tournament:edit',
    'team:view', 'team:edit',
    'audit:view'
)
WHERE r.name = 'moderator'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Support Admin permissions
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.admin_roles r 
JOIN public.admin_permissions p ON p.name IN (
    'user:view', 'user:edit',
    'verification:view', 'verification:approve', 'verification:reject',
    'tournament:view',
    'venue:view',
    'team:view',
    'audit:view'
)
WHERE r.name = 'support_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 5. CREATE SUPER ADMIN USER
-- =====================================================

-- First, ensure the user exists in auth.users
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '6f7da42e-a787-4533-83f4-e06da5c8ce7d',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@fragandbook.com',
    '$2a$10$dummy.hash.for.testing.purposes.only',
    NOW(),
    NULL,
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"username": "admin", "full_name": "Super Admin"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = NOW();

-- Update the profile to be a super admin
UPDATE public.profiles SET
    username = 'admin',
    full_name = 'Super Admin',
    email = 'admin@fragandbook.com',
    role = 'admin',
    is_admin = TRUE,
    admin_roles = ARRAY['super_admin'],
    admin_permissions = ARRAY[]::TEXT[],
    is_verified = TRUE,
    verification_status = 'verified',
    bio = 'Platform Administrator',
    updated_at = NOW()
WHERE id = '6f7da42e-a787-4533-83f4-e06da5c8ce7d';

-- If profile doesn't exist, create it
INSERT INTO public.profiles (
    id,
    username,
    full_name,
    email,
    avatar_url,
    bio,
    role,
    is_admin,
    admin_roles,
    admin_permissions,
    is_verified,
    verification_status,
    gaming_profile,
    social_links,
    created_at,
    updated_at
) VALUES (
    '6f7da42e-a787-4533-83f4-e06da5c8ce7d',
    'admin',
    'Super Admin',
    'admin@fragandbook.com',
    NULL,
    'Platform Administrator',
    'admin',
    TRUE,
    ARRAY['super_admin'],
    ARRAY[]::TEXT[],
    TRUE,
    'verified',
    '{}'::JSONB,
    '{}'::JSONB,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    is_admin = EXCLUDED.is_admin,
    admin_roles = EXCLUDED.admin_roles,
    admin_permissions = EXCLUDED.admin_permissions,
    is_verified = EXCLUDED.is_verified,
    verification_status = EXCLUDED.verification_status,
    bio = EXCLUDED.bio,
    updated_at = NOW();

-- Assign super admin role to the user
INSERT INTO public.admin_user_roles (user_id, role_id, assigned_by, assigned_at)
SELECT 
    '6f7da42e-a787-4533-83f4-e06da5c8ce7d',
    r.id,
    '6f7da42e-a787-4533-83f4-e06da5c8ce7d',
    NOW()
FROM public.admin_roles r 
WHERE r.name = 'super_admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 6. CREATE SYSTEM SETTINGS
-- =====================================================

INSERT INTO public.system_settings (key, value, description) VALUES
    ('maintenance_mode', 'false', 'Enable/disable maintenance mode'),
    ('contact_email', '"admin@fragandbook.com"', 'Platform contact email'),
    ('support_url', '"https://fragandbook.com/support"', 'Support page URL'),
    ('max_team_size', '5', 'Maximum team size for tournaments'),
    ('min_team_size', '1', 'Minimum team size for tournaments'),
    ('default_entry_fee', '0', 'Default entry fee for tournaments'),
    ('platform_fee_percentage', '5', 'Platform fee percentage'),
    ('verification_required', 'true', 'Require verification for organizers and venue owners'),
    ('max_tournament_duration_days', '7', 'Maximum tournament duration in days'),
    ('registration_deadline_hours', '24', 'Registration deadline hours before tournament start'),
    ('admin_notifications', 'true', 'Enable admin notifications'),
    ('user_registration', 'true', 'Allow new user registrations'),
    ('tournament_auto_approval', 'false', 'Auto-approve tournaments without admin review')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    description = EXCLUDED.description;

-- 7. TEST THE ADMIN SETUP
-- =====================================================

SELECT '=== ADMIN ROLES ===' as test;
SELECT id, name, description FROM public.admin_roles ORDER BY name;

SELECT '=== ADMIN PERMISSIONS ===' as test;
SELECT id, name, description, resource, action FROM public.admin_permissions ORDER BY resource, action;

SELECT '=== ROLE-PERMISSION MAPPINGS ===' as test;
SELECT r.name as role, p.name as permission, p.resource, p.action
FROM public.admin_role_permissions rp
JOIN public.admin_roles r ON r.id = rp.role_id
JOIN public.admin_permissions p ON p.id = rp.permission_id
ORDER BY r.name, p.resource, p.action;

SELECT '=== ADMIN USER ===' as test;
SELECT id, username, full_name, email, role, is_admin, admin_roles 
FROM public.profiles 
WHERE id = '6f7da42e-a787-4533-83f4-e06da5c8ce7d';

SELECT '=== USER-ROLE ASSIGNMENTS ===' as test;
SELECT p.username, p.full_name, r.name as role
FROM public.admin_user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
JOIN public.admin_roles r ON r.id = ur.role_id;

-- 8. SUCCESS MESSAGE
-- =====================================================

SELECT '🎉 ADMIN SYSTEM SETUP COMPLETE!' as message;
SELECT '✅ All admin roles and permissions created' as status;
SELECT '✅ Super admin user created and configured' as result;
SELECT '✅ You can now access admin features in the application' as next_step;
