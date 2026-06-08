import { useCallback, useMemo } from 'react';
import { useAdmin } from '@/hooks/useAdmin';

type PermissionFn = (permission: string) => boolean;

type AdminAccessContext = ReturnType<typeof useAdmin> & {
  can?: unknown;
  hasPermission?: unknown;
  isSuperAdmin?: boolean;
};

export function useAdminAccess() {
  const admin = useAdmin() as AdminAccessContext;
  const roles = useMemo(() => (
    Array.isArray(admin.roles) ? admin.roles : []
  ), [admin.roles]);
  const permissions = useMemo(() => (
    Array.isArray(admin.permissions) ? admin.permissions : []
  ), [admin.permissions]);
  const isSuperAdmin = Boolean(admin.isSuperAdmin) || roles.includes('super_admin');

  const can = useCallback<PermissionFn>((permission) => {
    if (typeof admin.can === 'function') {
      return (admin.can as PermissionFn)(permission);
    }

    if (typeof admin.hasPermission === 'function') {
      return (admin.hasPermission as PermissionFn)(permission);
    }

    return Boolean(admin.isAdmin) && (isSuperAdmin || permissions.includes(permission));
  }, [admin, isSuperAdmin, permissions]);

  return {
    ...admin,
    roles,
    permissions,
    isSuperAdmin,
    can,
    hasPermission: can,
  };
}
