import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { AdminUser } from '@/types/admin';

interface ApiUserRow {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_suspended: boolean | null;
  created_at: string;
  roles: string[];
}

interface AdminUsersResponse {
  users: ApiUserRow[];
  total: number;
}

function mapRow(row: ApiUserRow): AdminUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    roles: row.roles ?? [],
    createdAt: row.created_at,
    status: row.is_suspended ? 'suspended' : 'active',
  };
}

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '50', offset: '0' });
      if (search) params.set('search', search);

      const res = await apiClient.get<AdminUsersResponse>(`/api/admin/users?${params}`);
      setUsers((res.users ?? []).map(mapRow));
      setTotal(res.total ?? 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Client-side filter for instant search UX; server-side search available via fetchUsers
  const filteredUsers = searchTerm
    ? users.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : users;

  return {
    users: filteredUsers,
    total,
    searchTerm,
    setSearchTerm,
    loading,
    error,
    refetch: fetchUsers,
  };
};
