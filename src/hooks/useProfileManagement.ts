
import { UserProfile } from '@/types/auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const useProfileManagement = () => {
  const { toast } = useToast();

  const updateProfile = async (updates: Partial<UserProfile>, userId: string): Promise<void> => {
    try {
      // Filter out undefined/null values and only include valid profile fields
      const validUpdates: Record<string, any> = {};
      const allowedFields = ['username', 'full_name', 'avatar_url', 'bio', 'gamer_tag', 'phone', 'location'];
      
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key) && updates[key as keyof UserProfile] !== undefined && updates[key as keyof UserProfile] !== null) {
          validUpdates[key] = updates[key as keyof UserProfile];
        }
      });

      if (Object.keys(validUpdates).length === 0) {
        toast({
          title: "No changes",
          description: "No valid fields to update.",
          variant: "destructive",
        });
        return;
      }

      // If username is being updated, check if it's already taken
      if (validUpdates.username) {
        const { data: existingProfile, error: checkError } = await supabase
          .from('profiles')
          .select('id, username')
          .eq('username', validUpdates.username)
          .neq('id', userId)
          .maybeSingle();

        if (checkError) {
          console.error("Error checking username:", checkError);
          // Continue with update attempt - let database handle it
        } else if (existingProfile) {
          toast({
            title: "Username already taken",
            description: `The username "${validUpdates.username}" is already in use. Please choose a different username.`,
            variant: "destructive",
          });
          throw new Error('Username already taken');
        }
      }

      console.log("Updating profile with:", validUpdates, "for user:", userId);

      const { data, error } = await supabase
        .from('profiles')
        .update(validUpdates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error("Error updating profile:", error);
        console.error("Error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        // Handle specific error cases
        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
          if (error.message?.includes('username')) {
            toast({
              title: "Username already taken",
              description: `The username "${validUpdates.username}" is already in use. Please choose a different username.`,
              variant: "destructive",
            });
            throw new Error('Username already taken');
          } else {
            toast({
              title: "Duplicate value",
              description: "This value is already in use. Please choose a different one.",
              variant: "destructive",
            });
            throw error;
          }
        }
        
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
      
      // Don't show toast if we already showed one for username conflict
      if (error?.message === 'Username already taken') {
        throw error;
      }
      
      const errorMessage = error?.message || error?.details || error?.hint || 'An unexpected error occurred';
      toast({
        title: "Error updating profile",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  return { updateProfile };
};
