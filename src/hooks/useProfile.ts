import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile, UserRole } from '@/types/auth';

export const useProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = async (userId: string) => {
    if (!userId) {
      return null;
    }

    try {
      // console.log("=== Fetching profile for user:", userId);
      setLoading(true);
      setError(null);

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        setError(profileError);
        setLoading(false);
        return null;
      }

      if (!profileData) {
        setLoading(false);
        return null;
      }

      // Get user metadata
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      let userRole: UserRole = 'casual';

      if (userError) {
        // Silent fail for metadata
      } else {
        // Use role from profile data (which we already fetched)
        if (profileData.role) {
          userRole = profileData.role as UserRole;
        } else {
          // Fallback to user metadata
          const metadataRole = user?.user_metadata?.role;
          if (metadataRole) {
            userRole = metadataRole as UserRole;
          } else {
            userRole = 'casual';
          }
        }
      }

      // Create the complete profile with the role
      const completeProfile: UserProfile = {
        ...profileData,
        role: userRole
      };



      // console.log("Setting complete profile:", completeProfile);
      setProfile(completeProfile);
      setLoading(false);
      return completeProfile;

    } catch (err) {
      setError(err as Error);
      setLoading(false);
      return null;
    }
  };

  const clearProfile = () => {
    setProfile(null);
    setError(null);
  };

  return {
    profile,
    loading,
    error,
    fetchProfile,
    clearProfile
  };
};
