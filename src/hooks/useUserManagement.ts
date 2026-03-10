import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export const useUserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingRoleChange, setProcessingRoleChange] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.get<{ data: UserProfile[]; total: number }>('/api/admin/users?limit=500');
      setUsers(result.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
      toast({
        title: "Error",
        description: `Failed to load users: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      setProcessingRoleChange(userId);

      await apiClient.post(`/api/admin/users/${userId}/action`, { action: 'delete-user' });

      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));

      toast({
        title: "User Deleted",
        description: "User and all associated data have been deleted successfully.",
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to communicate with the server",
        variant: "destructive",
      });
    } finally {
      setProcessingRoleChange(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setProcessingRoleChange(userId);

      let mappedRole = newRole;
      if (newRole === 'player') mappedRole = 'organizer';

      await apiClient.post(`/api/admin/users/${userId}/action`, {
        action: 'update-role',
        role: mappedRole,
      });

      toast({
        title: "Role Updated",
        description: `User role has been updated to ${newRole} successfully.`,
      });

      await fetchUsers();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: "Role Update Failed",
        description: error.message || "Failed to communicate with the server",
        variant: "destructive",
      });
    } finally {
      setProcessingRoleChange(null);
    }
  };

  const cleanupOrphanedProfiles = async () => {
    try {
      setLoading(true);
      // Orphan cleanup requires server-side auth.admin access — delegate to backend
      await apiClient.post('/api/admin/users/cleanup', {});
      await fetchUsers();
      toast({
        title: "Cleanup Complete",
        description: "Orphaned profiles have been removed.",
      });
    } catch (error: any) {
      console.error('Error cleaning up profiles:', error);
      toast({
        title: "Cleanup Failed",
        description: error.message || "Cleanup endpoint not yet implemented on backend",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    error,
    processingRoleChange,
    fetchUsers,
    handleRoleChange,
    deleteUser,
    cleanupOrphanedProfiles
  };
};
