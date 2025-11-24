import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_PERMISSIONS } from '@/hooks/useAdminPermissions';

type AdminContextValue = {
  isAdmin: boolean;
  roles: string[];
  permissions: string[];
  loading: boolean;
  hasPermission: (perm: string) => boolean;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
};

const AdminContext = createContext<AdminContextValue>({
  isAdmin: false,
  roles: [],
  permissions: [],
  loading: true,
  hasPermission: () => false,
  refresh: async () => {}
});

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  const load = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoadingAdmin(true);
    }

    if (!user) {
      setIsAdmin(false);
      setRoles([]);
      setPermissions([]);
      if (!silent) {
        setLoadingAdmin(false);
      }
      return;
    }

    try {
      // Helper to normalize role names/keys to our canonical format
      const normalizeRole = (role?: string | null) =>
        role ? role.toLowerCase().replace(/\s+/g, '_') : null;

      // 1. Get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, admin_roles, admin_permissions')
        .eq('id', user.id)
        .maybeSingle();

      const profileRoles = (profile?.admin_roles as string[]) || [];
      const normalizedProfileRoles = profileRoles
        .map(normalizeRole)
        .filter((role): role is string => !!role);

      const directPermissions = (profile?.admin_permissions as string[]) || [];

      // 2. Fetch authoritative roles from admin_user_roles mapping table
      let normalizedRolesFromMapping: string[] = [];
      const { data: adminUserRoleRecords, error: adminUserRolesError } = await supabase
        .from('admin_user_roles')
        .select('role_id')
        .eq('user_id', user.id);

      if (adminUserRolesError) {
        console.error('Error loading admin_user_roles mapping:', adminUserRolesError);
      } else if (adminUserRoleRecords && adminUserRoleRecords.length > 0) {
        const roleIds = adminUserRoleRecords
          .map(record => record.role_id)
          .filter((roleId): roleId is string => !!roleId);

        if (roleIds.length > 0) {
          const { data: roleRecords, error: roleLookupError } = await supabase
            .from('admin_roles')
            .select('id, name')
            .in('id', roleIds);

          if (roleLookupError) {
            console.error('Error looking up admin_roles metadata:', roleLookupError);
          } else {
            normalizedRolesFromMapping = (roleRecords || [])
              .map(record => normalizeRole(record?.name))
              .filter((role): role is string => !!role);
          }
        }
      }

      // 3. Combine roles from profile column and authoritative mapping table
      const combinedRoles = Array.from(
        new Set([...normalizedProfileRoles, ...normalizedRolesFromMapping])
      );
      const isUserAdmin = !!profile?.is_admin || combinedRoles.length > 0;

      setIsAdmin(isUserAdmin);
      setRoles(combinedRoles);

      // Calculate role-based permissions
      const rolePermissions = new Set<string>();
      
      // Add permissions from each role
      combinedRoles.forEach(role => {
        const rolePerms = ROLE_PERMISSIONS[role] || [];
        rolePerms.forEach(perm => rolePermissions.add(perm));
      });
      
      // Add direct permissions from profile
      directPermissions.forEach(perm => rolePermissions.add(perm));

      setPermissions(Array.from(rolePermissions));

      console.log('Admin context loaded:', {
        isAdmin: isUserAdmin,
        rawRoles: profileRoles,
        normalizedRoles: combinedRoles,
        profileRolesSource: normalizedProfileRoles,
        mappingRolesSource: normalizedRolesFromMapping,
        permissions: Array.from(rolePermissions),
        rolePermissionsMap: combinedRoles.map(role => ({
          role,
          permissions: ROLE_PERMISSIONS[role] || [],
          hasPermissions: (ROLE_PERMISSIONS[role] || []).length > 0
        })),
        availableRoleKeys: Object.keys(ROLE_PERMISSIONS),
        profileData: {
          is_admin: profile?.is_admin,
          admin_roles: profile?.admin_roles
        }
      });
    } catch (error) {
      console.error('Error loading admin context:', error);
      setIsAdmin(false);
      setRoles([]);
      setPermissions([]);
    } finally {
      if (!silent) {
        setLoadingAdmin(false);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Listen for custom events to refresh when admin roles change
  useEffect(() => {
    const handleAdminRoleUpdate = () => {
      console.log('Admin role update event received, refreshing...');
      setTimeout(() => load({ silent: true }), 100); // Small delay to ensure DB update is complete
    };
    
    window.addEventListener('adminRolesUpdated', handleAdminRoleUpdate);
    return () => window.removeEventListener('adminRolesUpdated', handleAdminRoleUpdate);
  }, [load]);
  
  // Also listen for storage events (for cross-tab updates)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'admin_roles_updated' && user) {
        console.log('Admin roles updated in another tab, refreshing...');
        setTimeout(() => load({ silent: true }), 100);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user, load]);
  
  // Poll for admin role changes (as a fallback)
  // This helps detect role changes even if events don't fire
  useEffect(() => {
    if (!user) return;
    
    // Poll every 10 seconds to check for role changes
    const pollInterval = setInterval(() => {
      console.log('Polling for admin role changes...', { currentIsAdmin: isAdmin, currentRoles: roles });
      load({ silent: true });
    }, 10000); // Poll every 10 seconds
    
    return () => clearInterval(pollInterval);
  }, [user, load, isAdmin, roles]);

  const hasPermission = (perm: string): boolean => {
    if (!isAdmin) return false;
    
    // Super admin has all permissions
    if (roles.includes('super_admin')) return true;
    
    // Check if user has the specific permission
    return permissions.includes(perm);
  };

  const value = useMemo<AdminContextValue>(() => ({
    isAdmin,
    roles,
    permissions,
    loading: loadingAdmin,
    hasPermission,
    refresh: load
  }), [isAdmin, roles, permissions, hasPermission, loadingAdmin, load]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = () => useContext(AdminContext);


