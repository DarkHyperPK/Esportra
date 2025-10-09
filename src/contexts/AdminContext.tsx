import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type AdminContextValue = {
  isAdmin: boolean;
  roles: string[];
  permissions: string[];
  hasPermission: (perm: string) => boolean;
  refresh: () => Promise<void>;
};

const AdminContext = createContext<AdminContextValue>({
  isAdmin: false,
  roles: [],
  permissions: [],
  hasPermission: () => false,
  refresh: async () => {}
});

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);

  const load = async () => {
    if (!user) {
      setIsAdmin(false);
      setRoles([]);
      setPermissions([]);
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, admin_roles, admin_permissions')
      .eq('id', user.id)
      .maybeSingle();
    setIsAdmin(!!profile?.is_admin);
    setRoles((profile?.admin_roles as string[]) || []);
    // merge role permissions from mapping
    const perms = new Set<string>((profile?.admin_permissions as string[]) || []);
    if (profile?.is_admin) {
      const { data: rolePerms } = await supabase.rpc('get_admin_permissions_for_user', { p_user: user.id }).catch(() => ({ data: [] } as any));
      (rolePerms || []).forEach((k: string) => perms.add(k));
    }
    setPermissions(Array.from(perms));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const value = useMemo<AdminContextValue>(() => ({
    isAdmin,
    roles,
    permissions,
    hasPermission: (perm: string) => permissions.includes(perm) || roles.includes('super_admin'),
    refresh: load
  }), [isAdmin, roles, permissions]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = () => useContext(AdminContext);


