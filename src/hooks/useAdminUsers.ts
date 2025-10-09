
import { useState, useEffect } from 'react';
import { AdminUser } from '@/types/admin';

// Mock users data - in a real application, this would come from an API
const mockUsers: AdminUser[] = [
  {
    id: '1',
    username: 'admin_user',
    email: 'admin@example.com',
    roles: ['admin'],
    createdAt: '2023-04-01',
    status: 'active',
  },
  {
    id: '2',
    username: 'venue_owner1',
    email: 'venue1@example.com',
    roles: ['venue_owner'],
    createdAt: '2023-04-10',
    status: 'active',
  },
  {
    id: '3',
    username: 'tournament_org',
    email: 'tourney@example.com',
    roles: ['organizer'],
    createdAt: '2023-04-15',
    status: 'active',
  },
  {
    id: '4',
    username: 'gamer123',
    email: 'gamer@example.com',
    roles: ['player'],
    createdAt: '2023-04-20',
    status: 'active',
  },
  {
    id: '5',
    username: 'multi_role',
    email: 'multi@example.com',
    roles: ['venue_owner', 'organizer'],
    createdAt: '2023-04-25',
    status: 'active',
  },
];

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulating API call to fetch users
    setLoading(true);
    try {
      // In a real implementation, this would be an API call
      setUsers(mockUsers);
      setError(null);
    } catch (err) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return {
    users: filteredUsers,
    searchTerm,
    setSearchTerm,
    loading,
    error
  };
};
