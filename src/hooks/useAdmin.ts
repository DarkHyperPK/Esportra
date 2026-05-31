import { useContext } from 'react';
import { AdminContext } from '@/contexts/admin-context';

export const useAdmin = () => useContext(AdminContext);
