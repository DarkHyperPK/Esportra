import { useState } from 'react';
import apiClient from '@/lib/api';

export const useMongoProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = async (userId: string) => {
    if (!userId) {
      console.log("No user ID provided to fetchProfile");
      return null;
    }
    
    try {
      console.log("=== Fetching profile for user:", userId);
      setLoading(true);
      setError(null);
      
      // Fetch profile data from MongoDB API
      const response = await apiClient.getCurrentUser();
      
      if (response.success) {
        console.log("Setting complete profile:", response.data.user);
        setProfile(response.data.user);
        setLoading(false);
        return response.data.user;
      } else {
        console.log("Profile not found for user:", userId);
        setLoading(false);
        return null;
      }
      
    } catch (err) {
      console.error("Error in fetchProfile:", err);
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
