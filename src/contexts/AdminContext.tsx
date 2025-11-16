import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_PERMISSIONS } from '@/hooks/useAdminPermissions';

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

    try {
      // Get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, admin_roles, admin_permissions')
        .eq('id', user.id)
        .maybeSingle();

      const isUserAdmin = !!profile?.is_admin;
      const userRoles = (profile?.admin_roles as string[]) || [];
      const directPermissions = (profile?.admin_permissions as string[]) || [];

      setIsAdmin(isUserAdmin);
      setRoles(userRoles);

      // Calculate role-based permissions
      const rolePermissions = new Set<string>();
      
      // Add permissions from each role
      userRoles.forEach(role => {
        const rolePerms = ROLE_PERMISSIONS[role] || [];
        rolePerms.forEach(perm => rolePermissions.add(perm));
      });
      
      // Add direct permissions from profile
      directPermissions.forEach(perm => rolePermissions.add(perm));

      setPermissions(Array.from(rolePermissions));

      console.log('Admin context loaded:', {
        isAdmin: isUserAdmin,
        roles: userRoles,
        permissions: Array.from(rolePermissions)
      });
    } catch (error) {
      console.error('Error loading admin context:', error);
      setIsAdmin(false);
      setRoles([]);
      setPermissions([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
    hasPermission,
    refresh: load
  }), [isAdmin, roles, permissions]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = () => useContext(AdminContext);


