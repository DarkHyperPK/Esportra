import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { isSuperAdminFromProfile } from '@/lib/adminAccess';
import { AdminContext, type AdminContextValue } from '@/contexts/admin-context';

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
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

    if (!profile) {
      if (!silent) {
        setLoadingAdmin(true);
      }
      return;
    }

    try {
      const ctx = await apiClient.get<{
        adminRoles: string[];
        permissions: string[];
        isSuperAdmin?: boolean;
      }>('/api/admin/my-context');

      const apiRoles = (ctx.adminRoles || []).map((role) => role.toLowerCase());
      const apiPermissions = ctx.permissions || [];
      const hasAdminAccess = apiRoles.length > 0 || ctx.isSuperAdmin === true;

      if (hasAdminAccess) {
        setIsAdmin(true);
        setRoles(apiRoles);
        setPermissions(apiPermissions);
        return;
      }

      // Fallback when API returns empty but profile still marks admin (sync lag)
      if (profile.is_admin) {
        const profileRoles = (profile.admin_roles || [])
          .map((role) => role.toLowerCase().replace(/\s+/g, '_'))
          .filter(Boolean);
        setIsAdmin(profileRoles.length > 0 || isSuperAdminFromProfile(profile));
        setRoles(profileRoles);
        setPermissions([]);
        return;
      }

      setIsAdmin(false);
      setRoles([]);
      setPermissions([]);
    } catch {
      if (profile.is_admin) {
        const profileRoles = (profile.admin_roles || [])
          .map((role) => role.toLowerCase().replace(/\s+/g, '_'))
          .filter(Boolean);
        setIsAdmin(profileRoles.length > 0);
        setRoles(profileRoles);
        setPermissions([]);
      } else {
        setIsAdmin(false);
        setRoles([]);
        setPermissions([]);
      }
    } finally {
      if (!silent) {
        setLoadingAdmin(false);
      }
    }
  }, [user, profile]);

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
