import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
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

      // Single API call replaces 3 Supabase queries (profile + admin_user_roles + admin_roles)
      // The profile's admin_roles column is the canonical source of role names
      const profile = await apiClient.get<{
        is_admin: boolean;
        admin_roles: string[] | null;
        admin_permissions: string[] | null;
      }>('/api/profiles/me');

      const profileRoles = (profile?.admin_roles || [])
        .map(normalizeRole)
        .filter((role): role is string => !!role);

      const directPermissions = profile?.admin_permissions || [];
      const isUserAdmin = !!profile?.is_admin || profileRoles.length > 0;

      setIsAdmin(isUserAdmin);
      setRoles(profileRoles);

      const rolePermissions = new Set<string>();

      profileRoles.forEach(role => {
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

  // Polling removed — admin roles refresh on-demand via events or page navigation

  const hasPermission = useCallback((perm: string): boolean => {
    if (!isAdmin) return false;
    if (roles.includes('super_admin')) return true;
    return permissions.includes(perm);
  }, [isAdmin, roles, permissions]);

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
