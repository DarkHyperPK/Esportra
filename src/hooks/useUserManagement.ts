import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email, full_name, avatar_url');

      if (error) throw error;

      setUsers(data || []);
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

      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'delete-user',
          targetUserId: userId
        }
      });

      if (error) throw error;

      // Remove user from local state
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

      // Map frontend role to database role if necessary
      let supabaseRole = newRole;
      if (newRole === 'player') supabaseRole = 'organizer';

      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'update-role',
          targetUserId: userId,
          payload: { newRole: supabaseRole }
        }
      });

      if (error) throw error;

      toast({
        title: "Role Updated",
        description: `User role has been updated to ${newRole} successfully.`,
      });

      // Refresh the page or fetch users again to show changes
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

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id');

      if (profilesError) throw profilesError;

      // For each profile, check if the user exists in auth
      for (const profile of profiles) {
        const { data: user, error: userError } = await supabase.auth.admin.getUserById(profile.id);

        if (userError || !user) {
          // If user doesn't exist, delete the profile
          const { error: deleteError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', profile.id);

          if (deleteError) {
            console.error(`Failed to delete orphaned profile ${profile.id}:`, deleteError);
          } else {
            console.log(`Deleted orphaned profile: ${profile.id}`);
          }
        }
      }

      // Refresh the users list
      await fetchUsers();

      toast({
        title: "Cleanup Complete",
        description: "Orphaned profiles have been removed.",
      });
    } catch (error: any) {
      console.error('Error cleaning up profiles:', error);
      toast({
        title: "Cleanup Failed",
        description: error.message,
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
