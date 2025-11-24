-- =====================================================
-- CHECK AND FIX ADMIN ROLES
-- =====================================================
-- This script checks if admin roles exist and creates them if needed

-- 1. Check if admin_roles table exists and has data
SELECT '=== CHECKING ADMIN ROLES TABLE ===' as step;
SELECT COUNT(*) as role_count FROM public.admin_roles;

-- 2. If no roles exist, create them
INSERT INTO public.admin_roles (name, description) VALUES
    ('super_admin', 'Full system access and control'),
    ('ops_admin', 'Tournament and venue management'),
    ('finance_admin', 'Payment and financial management'),
    ('moderator', 'Community and content moderation'),
    ('support_admin', 'User support and verification')
ON CONFLICT (name) DO NOTHING;

-- 3. Check if admin_permissions table exists and has data
SELECT '=== CHECKING ADMIN PERMISSIONS TABLE ===' as step;
SELECT COUNT(*) as permission_count FROM public.admin_permissions;

-- 4. If no permissions exist, create them
INSERT INTO public.admin_permissions (name, description, resource, action) VALUES
    ('user:view', 'View user profiles', 'users', 'read'),
    ('user:edit', 'Edit user profiles', 'users', 'update'),
    ('user:ban', 'Ban users', 'users', 'update'),
    ('user:suspend', 'Suspend users', 'users', 'update'),
    ('user:delete', 'Delete users', 'users', 'delete'),
    ('tournament:view', 'View tournaments', 'tournaments', 'read'),
    ('tournament:create', 'Create tournaments', 'tournaments', 'create'),
    ('tournament:edit', 'Edit tournaments', 'tournaments', 'update'),
    ('tournament:approve', 'Approve tournaments', 'tournaments', 'update'),
    ('tournament:feature', 'Feature tournaments', 'tournaments', 'update'),
    ('tournament:delete', 'Delete tournaments', 'tournaments', 'delete'),
    ('venue:view', 'View venues', 'venues', 'read'),
    ('venue:create', 'Create venues', 'venues', 'create'),
    ('venue:edit', 'Edit venues', 'venues', 'update'),
    ('venue:approve', 'Approve venues', 'venues', 'update'),
    ('venue:verify', 'Verify venues', 'venues', 'update'),
    ('venue:delete', 'Delete venues', 'venues', 'delete'),
    ('verification:view', 'View verification requests', 'verification', 'read'),
    ('verification:approve', 'Approve verification requests', 'verification', 'update'),
    ('verification:reject', 'Reject verification requests', 'verification', 'update'),
    ('team:view', 'View teams', 'teams', 'read'),
    ('team:edit', 'Edit teams', 'teams', 'update'),
    ('team:delete', 'Delete teams', 'teams', 'delete'),
    ('audit:view', 'View audit logs', 'audit', 'read'),
    ('settings:view', 'View system settings', 'settings', 'read'),
    ('settings:edit', 'Edit system settings', 'settings', 'update'),
    ('admin:manage', 'Manage admin roles', 'admin', 'manage'),
    ('admin:assign_roles', 'Assign admin roles to users', 'admin', 'manage')
ON CONFLICT (name) DO NOTHING;

-- 5. Show current roles
SELECT '=== CURRENT ADMIN ROLES ===' as step;
SELECT id, name, description FROM public.admin_roles ORDER BY name;

-- 6. Show current permissions
SELECT '=== CURRENT ADMIN PERMISSIONS ===' as step;
SELECT id, name, description, resource, action FROM public.admin_permissions ORDER BY resource, action;

-- 7. Success message
SELECT '🎉 Admin roles and permissions are ready!' as message;
SELECT '✅ You should now see roles in the Admin Access page' as status;
