import { useAdmin } from '@/hooks/useAdmin';

export interface AdminPermission {
  key: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: AdminPermission[];
}

// Define all available permissions — keys use PLURAL resource names to match the DB
export const ADMIN_PERMISSIONS: Record<string, AdminPermission> = {
  // User Management
  'users:view': {
    key: 'users:view',
    name: 'View Users',
    description: 'View user profiles and information',
    resource: 'users',
    action: 'read'
  },
  'users:edit': {
    key: 'users:edit',
    name: 'Edit Users',
    description: 'Edit user profiles and information',
    resource: 'users',
    action: 'update'
  },
  'users:ban': {
    key: 'users:ban',
    name: 'Ban Users',
    description: 'Ban or suspend users from the platform',
    resource: 'users',
    action: 'update'
  },
  'users:delete': {
    key: 'users:delete',
    name: 'Delete Users',
    description: 'Permanently delete user accounts',
    resource: 'users',
    action: 'delete'
  },

  // Tournament Management
  'tournaments:view': {
    key: 'tournaments:view',
    name: 'View Tournaments',
    description: 'View tournament information',
    resource: 'tournaments',
    action: 'read'
  },
  'tournaments:create': {
    key: 'tournaments:create',
    name: 'Create Tournaments',
    description: 'Create new tournaments',
    resource: 'tournaments',
    action: 'create'
  },
  'tournaments:edit': {
    key: 'tournaments:edit',
    name: 'Edit Tournaments',
    description: 'Edit, approve, and feature tournament information',
    resource: 'tournaments',
    action: 'update'
  },
  'tournaments:delete': {
    key: 'tournaments:delete',
    name: 'Delete Tournaments',
    description: 'Delete tournaments',
    resource: 'tournaments',
    action: 'delete'
  },

  // Venue Management
  'venues:view': {
    key: 'venues:view',
    name: 'View Venues',
    description: 'View venue information',
    resource: 'venues',
    action: 'read'
  },
  'venues:approve': {
    key: 'venues:approve',
    name: 'Approve Venues',
    description: 'Approve and verify venue submissions',
    resource: 'venues',
    action: 'update'
  },
  'venues:delete': {
    key: 'venues:delete',
    name: 'Delete Venues',
    description: 'Delete venues',
    resource: 'venues',
    action: 'delete'
  },

  // Dispute Management
  'disputes:resolve': {
    key: 'disputes:resolve',
    name: 'Resolve Disputes',
    description: 'Review and resolve user disputes',
    resource: 'disputes',
    action: 'update'
  },

  // Sponsor / Content
  'sponsors:view': {
    key: 'sponsors:view',
    name: 'View Sponsors',
    description: 'View sponsor information',
    resource: 'sponsors',
    action: 'read'
  },
  'content:moderate': {
    key: 'content:moderate',
    name: 'Moderate Content',
    description: 'Review and moderate platform content',
    resource: 'content',
    action: 'update'
  },

  // System Management
  'system:audit': {
    key: 'system:audit',
    name: 'View Audit Logs',
    description: 'View system audit logs and analytics',
    resource: 'system',
    action: 'read'
  },
  'system:settings': {
    key: 'system:settings',
    name: 'Manage Settings',
    description: 'View and edit system settings, manage admin roles',
    resource: 'system',
    action: 'manage'
  },

  // Analytics
  'analytics:view': {
    key: 'analytics:view',
    name: 'View Analytics',
    description: 'View platform analytics and reports',
    resource: 'analytics',
    action: 'read'
  }
};

// Define role-based permission mappings — keys use PLURAL resource names to match DB
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  'super_admin': Object.keys(ADMIN_PERMISSIONS), // Super admin gets all permissions
  'ops_admin': [
    'tournaments:view', 'tournaments:create', 'tournaments:edit', 'tournaments:delete',
    'venues:view', 'venues:approve', 'venues:delete',
    'users:view', 'users:edit',
    'system:audit',
    'disputes:resolve',
    'sponsors:view',
    'analytics:view'
  ],
  'finance_admin': [
    'users:view', 'users:edit',
    'system:audit',
    'system:settings',
    'analytics:view'
  ],
  'moderator': [
    'users:view', 'users:edit', 'users:ban',
    'tournaments:view', 'tournaments:edit',
    'system:audit',
    'disputes:resolve',
    'content:moderate'
  ],
  'support_admin': [
    'users:view', 'users:edit',
    'tournaments:view',
    'venues:view',
    'system:audit',
    'disputes:resolve'
  ]
};

export const useAdminPermissions = () => {
  const { isAdmin, roles, permissions, hasPermission } = useAdmin();

  // Get all permissions for current user's roles
  const getRolePermissions = (): string[] => {
    if (!isAdmin) return [];
    
    const rolePermissions = new Set<string>();
    
    // Add permissions from each role
    roles.forEach(role => {
      const rolePerms = ROLE_PERMISSIONS[role] || [];
      rolePerms.forEach(perm => rolePermissions.add(perm));
    });
    
    // Add direct permissions from profile
    permissions.forEach(perm => rolePermissions.add(perm));
    
    return Array.from(rolePermissions);
  };

  // Check if user can access a specific resource
  const canAccess = (resource: string, action: string): boolean => {
    if (!isAdmin) return false;
    
    const permissionKey = `${resource}:${action}`;
    return hasPermission(permissionKey);
  };

  // Get permissions grouped by resource
  const getPermissionsByResource = (): Record<string, AdminPermission[]> => {
    const userPermissions = getRolePermissions();
    const grouped: Record<string, AdminPermission[]> = {};
    
    userPermissions.forEach(permKey => {
      const permission = ADMIN_PERMISSIONS[permKey];
      if (permission) {
        if (!grouped[permission.resource]) {
          grouped[permission.resource] = [];
        }
        grouped[permission.resource].push(permission);
      }
    });
    
    return grouped;
  };

  // Check if user has any permission for a resource
  const canAccessResource = (resource: string): boolean => {
    if (!isAdmin) return false;
    
    const userPermissions = getRolePermissions();
    return userPermissions.some(perm => perm.startsWith(`${resource}:`));
  };

  return {
    isAdmin,
    roles,
    permissions: getRolePermissions(),
    hasPermission,
    canAccess,
    canAccessResource,
    getPermissionsByResource,
    ADMIN_PERMISSIONS,
    ROLE_PERMISSIONS
  };
};
