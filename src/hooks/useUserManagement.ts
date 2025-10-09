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
      
      // First, delete all tournaments created by this user
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .delete()
        .eq('user_id', userId);

      if (tournamentError) {
        console.error('Error deleting tournaments:', tournamentError);
        throw new Error('Failed to delete user tournaments');
      }

      // Delete the user's role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleError) {
        console.error('Error deleting user role:', roleError);
        throw new Error('Failed to delete user role');
      }

      // Delete the user's profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        console.error('Error deleting user profile:', profileError);
        throw new Error('Failed to delete user profile');
      }

      // Finally, delete the user from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) {
        console.error('Error deleting user from auth:', authError);
        throw new Error('Failed to delete user from auth');
      }

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
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingRoleChange(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setProcessingRoleChange(userId);
      
      // Remove existing roles for the user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;
      
      // Make sure newRole is within the allowed types in Supabase
      // Convert 'player' to a role that exists in the database enum
      let supabaseRole: 'admin' | 'venue_owner' | 'organizer' = 'organizer';
      
      if (newRole === 'admin' || newRole === 'venue_owner' || newRole === 'organizer') {
        supabaseRole = newRole;
      } else if (newRole === 'player') {
        // For players we'll use organizer as the closest role in the database
        supabaseRole = 'organizer';
      }
      
      // Insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ 
          role: supabaseRole,
          user_id: userId 
        });

      if (error) throw error;

      // Show success toast
      toast({
        title: "Role Updated",
        description: `User role has been updated to ${newRole} successfully.`,
      });

      // Optimistically update the UI
      setUsers(prevUsers =>
        prevUsers.map(user => {
          if (user.id === userId) {
            return { ...user }; // For now, no roles in the user object
          }
          return user;
        })
      );
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: "Role Update Failed",
        description: error.message,
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
