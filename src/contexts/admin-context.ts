import { createContext } from 'react';

export type AdminContextValue = {
  isAdmin: boolean;
  roles: string[];
  permissions: string[];
  loading: boolean;
  hasPermission: (perm: string) => boolean;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
};

export const AdminContext = createContext<AdminContextValue>({
  isAdmin: false,
  roles: [],
  permissions: [],
  loading: true,
  hasPermission: () => false,
  refresh: async () => {},
});
