import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_PERMISSIONS } from '@/hooks/useAdminPermissions';
import { AdminContext, type AdminContextValue } from '@/contexts/admin-context';

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

      // Fetch profile for is_admin flag
      const profile = await apiClient.get<{
        is_admin: boolean;
        admin_roles: string[] | null;
      }>('/api/profiles/me');

      const isUserAdmin = !!profile?.is_admin;
      setIsAdmin(isUserAdmin);

      if (isUserAdmin) {
        try {
          // Primary source: backend resolves roles + permissions from DB (plural resource names)
          const ctx = await apiClient.get<{
            adminRoles: string[];
            permissions: string[];
          }>('/api/admin/my-context');

          setRoles(ctx.adminRoles || []);
          setPermissions(ctx.permissions || []);
        } catch {
          // Fallback: derive from profile's admin_roles + hardcoded ROLE_PERMISSIONS map
          const profileRoles = (profile?.admin_roles || [])
            .map(normalizeRole)
            .filter((role): role is string => !!role);

          setRoles(profileRoles);

          const rolePermissions = new Set<string>();
          profileRoles.forEach(role => {
            const rolePerms = ROLE_PERMISSIONS[role] || [];
            rolePerms.forEach(perm => rolePermissions.add(perm));
          });
          setPermissions(Array.from(rolePermissions));
        }
      } else {
        setRoles([]);
        setPermissions([]);
      }

    } catch {
      setRoles([]);
      setPermissions([]);
    } finally {
      if (!silent) {
        setLoadingAdmin(false);
      }
    }
  }, [user]);

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
