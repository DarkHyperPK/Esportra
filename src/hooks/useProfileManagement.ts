
import { UserProfile } from '@/types/auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const useProfileManagement = () => {
  const { toast } = useToast();

  const updateProfile = async (updates: Partial<UserProfile>, userId: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error("Error updating profile:", error);
        throw error;
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });

      // Return void instead of data
      return;
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error updating profile",
        description: error.message || 'An unexpected error occurred',
        variant: "destructive",
      });
      throw error;
    }
  };

  return { updateProfile };
};
