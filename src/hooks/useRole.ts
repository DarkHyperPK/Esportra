import { useContext } from 'react';
import { RoleContext, type RoleContextType } from '@/contexts/role-context';

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
