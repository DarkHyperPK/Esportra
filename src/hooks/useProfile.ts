import { useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { UserProfile, UserRole } from '@/types/auth';

export const useProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<Error | null>(null);

  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    if (!userId) return null;
    try {
      setLoading(true);
      setError(null);

      const data = await apiClient.get<UserProfile>(`/api/profiles/${userId}`);
      const role: UserRole = (data as any).role ?? 'casual';
      const completeProfile: UserProfile = { ...data, role };

      setProfile(completeProfile);
      return completeProfile;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearProfile = () => { setProfile(null); setError(null); };

  return { profile, loading, error, fetchProfile, clearProfile };
};
