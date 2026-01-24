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
  refresh: async () => { }
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
      const normalizeRole = (role?: string | null) =>
        role ? role.toLowerCase().replace(/\s+/g, '_') : null;

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

      let normalizedRolesFromMapping: string[] = [];
      const { data: adminUserRoleRecords } = await supabase
        .from('admin_user_roles')
        .select('role_id')
        .eq('user_id', user.id);

      if (adminUserRoleRecords && adminUserRoleRecords.length > 0) {
        const roleIds = adminUserRoleRecords
          .map(record => record.role_id)
          .filter((roleId): roleId is string => !!roleId);

        if (roleIds.length > 0) {
          const { data: roleRecords } = await supabase
            .from('admin_roles')
            .select('id, name')
            .in('id', roleIds);

          normalizedRolesFromMapping = (roleRecords || [])
            .map(record => normalizeRole(record?.name))
            .filter((role): role is string => !!role);
        }
      }

      const combinedRoles = Array.from(
        new Set([...normalizedProfileRoles, ...normalizedRolesFromMapping])
      );
      const isUserAdmin = !!profile?.is_admin || combinedRoles.length > 0;

      setIsAdmin(isUserAdmin);
      setRoles(combinedRoles);

      const rolePermissions = new Set<string>();

      combinedRoles.forEach(role => {
        const rolePerms = ROLE_PERMISSIONS[role] || [];
        rolePerms.forEach(perm => rolePermissions.add(perm));
      });

      directPermissions.forEach(perm => rolePermissions.add(perm));
      setPermissions(Array.from(rolePermissions));

    } catch (error) {
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

  useEffect(() => {
    const handleAdminRoleUpdate = () => {
      setTimeout(() => load({ silent: true }), 100);
    };

    window.addEventListener('adminRolesUpdated', handleAdminRoleUpdate);
    return () => window.removeEventListener('adminRolesUpdated', handleAdminRoleUpdate);
  }, [load]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'admin_roles_updated' && user) {
        setTimeout(() => load({ silent: true }), 100);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user, load]);

  useEffect(() => {
    if (!user) return;

    const pollInterval = setInterval(() => {
      load({ silent: true });
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [user, load]);

  const hasPermission = (perm: string): boolean => {
    if (!isAdmin) return false;
    if (roles.includes('super_admin')) return true;
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
