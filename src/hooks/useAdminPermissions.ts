import { useAdmin } from '@/contexts/AdminContext';

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

// Define all available permissions
export const ADMIN_PERMISSIONS: Record<string, AdminPermission> = {
  // User Management
  'user:view': {
    key: 'user:view',
    name: 'View Users',
    description: 'View user profiles and information',
    resource: 'users',
    action: 'read'
  },
  'user:edit': {
    key: 'user:edit',
    name: 'Edit Users',
    description: 'Edit user profiles and information',
    resource: 'users',
    action: 'update'
  },
  'user:ban': {
    key: 'user:ban',
    name: 'Ban Users',
    description: 'Ban users from the platform',
    resource: 'users',
    action: 'update'
  },
  'user:suspend': {
    key: 'user:suspend',
    name: 'Suspend Users',
    description: 'Temporarily suspend user accounts',
    resource: 'users',
    action: 'update'
  },
  'user:delete': {
    key: 'user:delete',
    name: 'Delete Users',
    description: 'Permanently delete user accounts',
    resource: 'users',
    action: 'delete'
  },

  // Tournament Management
  'tournament:view': {
    key: 'tournament:view',
    name: 'View Tournaments',
    description: 'View tournament information',
    resource: 'tournaments',
    action: 'read'
  },
  'tournament:create': {
    key: 'tournament:create',
    name: 'Create Tournaments',
    description: 'Create new tournaments',
    resource: 'tournaments',
    action: 'create'
  },
  'tournament:edit': {
    key: 'tournament:edit',
    name: 'Edit Tournaments',
    description: 'Edit tournament information',
    resource: 'tournaments',
    action: 'update'
  },
  'tournament:approve': {
    key: 'tournament:approve',
    name: 'Approve Tournaments',
    description: 'Approve tournament submissions',
    resource: 'tournaments',
    action: 'update'
  },
  'tournament:feature': {
    key: 'tournament:feature',
    name: 'Feature Tournaments',
    description: 'Feature tournaments on the platform',
    resource: 'tournaments',
    action: 'update'
  },
  'tournament:delete': {
    key: 'tournament:delete',
    name: 'Delete Tournaments',
    description: 'Delete tournaments',
    resource: 'tournaments',
    action: 'delete'
  },

  // Venue Management
  'venue:view': {
    key: 'venue:view',
    name: 'View Venues',
    description: 'View venue information',
    resource: 'venues',
    action: 'read'
  },
  'venue:create': {
    key: 'venue:create',
    name: 'Create Venues',
    description: 'Create new venues',
    resource: 'venues',
    action: 'create'
  },
  'venue:edit': {
    key: 'venue:edit',
    name: 'Edit Venues',
    description: 'Edit venue information',
    resource: 'venues',
    action: 'update'
  },
  'venue:approve': {
    key: 'venue:approve',
    name: 'Approve Venues',
    description: 'Approve venue submissions',
    resource: 'venues',
    action: 'update'
  },
  'venue:verify': {
    key: 'venue:verify',
    name: 'Verify Venues',
    description: 'Verify venue authenticity',
    resource: 'venues',
    action: 'update'
  },
  'venue:delete': {
    key: 'venue:delete',
    name: 'Delete Venues',
    description: 'Delete venues',
    resource: 'venues',
    action: 'delete'
  },

  // Verification Management
  'verification:view': {
    key: 'verification:view',
    name: 'View Verifications',
    description: 'View verification requests',
    resource: 'verification',
    action: 'read'
  },
  'verification:approve': {
    key: 'verification:approve',
    name: 'Approve Verifications',
    description: 'Approve verification requests',
    resource: 'verification',
    action: 'update'
  },
  'verification:reject': {
    key: 'verification:reject',
    name: 'Reject Verifications',
    description: 'Reject verification requests',
    resource: 'verification',
    action: 'update'
  },

  // Team Management
  'team:view': {
    key: 'team:view',
    name: 'View Teams',
    description: 'View team information',
    resource: 'teams',
    action: 'read'
  },
  'team:edit': {
    key: 'team:edit',
    name: 'Edit Teams',
    description: 'Edit team information',
    resource: 'teams',
    action: 'update'
  },
  'team:delete': {
    key: 'team:delete',
    name: 'Delete Teams',
    description: 'Delete teams',
    resource: 'teams',
    action: 'delete'
  },

  // System Management
  'audit:view': {
    key: 'audit:view',
    name: 'View Audit Logs',
    description: 'View system audit logs',
    resource: 'audit',
    action: 'read'
  },
  'settings:view': {
    key: 'settings:view',
    name: 'View Settings',
    description: 'View system settings',
    resource: 'settings',
    action: 'read'
  },
  'settings:edit': {
    key: 'settings:edit',
    name: 'Edit Settings',
    description: 'Edit system settings',
    resource: 'settings',
    action: 'update'
  },
  'admin:manage': {
    key: 'admin:manage',
    name: 'Manage Admins',
    description: 'Manage admin roles and permissions',
    resource: 'admin',
    action: 'manage'
  },
  'admin:assign_roles': {
    key: 'admin:assign_roles',
    name: 'Assign Roles',
    description: 'Assign admin roles to users',
    resource: 'admin',
    action: 'manage'
  }
};

// Define role-based permission mappings
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  'super_admin': Object.keys(ADMIN_PERMISSIONS), // Super admin gets all permissions
  'ops_admin': [
    'tournament:view', 'tournament:create', 'tournament:edit', 'tournament:approve', 'tournament:feature', 'tournament:delete',
    'venue:view', 'venue:create', 'venue:edit', 'venue:approve', 'venue:verify', 'venue:delete',
    'verification:view', 'verification:approve', 'verification:reject',
    'team:view', 'team:edit', 'team:delete',
    'user:view', 'user:edit',
    'audit:view', 'settings:view'
  ],
  'finance_admin': [
    'user:view', 'user:edit',
    'tournament:view',
    'venue:view',
    'audit:view', 'settings:view'
  ],
  'moderator': [
    'user:view', 'user:edit', 'user:suspend',
    'tournament:view', 'tournament:edit',
    'team:view', 'team:edit',
    'audit:view'
  ],
  'support_admin': [
    'user:view', 'user:edit',
    'verification:view', 'verification:approve', 'verification:reject',
    'tournament:view',
    'venue:view',
    'team:view',
    'audit:view'
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
