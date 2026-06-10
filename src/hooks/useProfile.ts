import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { UserProfile } from '@/types/auth';
import { normalizeProfileFromApi } from '@/utils/profileFields';

const fetchOwnProfile = async (userId: string): Promise<UserProfile> => {
  const data = await apiClient.get<Record<string, unknown>>('/api/profiles/me');
  return normalizeProfileFromApi(data, userId);
};

export const useProfile = () => {
  const queryClient = useQueryClient();
  const [trackedUserId, setTrackedUserId] = useState<string | null>(null);

  const { data: profile = null, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['profile', trackedUserId],
    queryFn: () => fetchOwnProfile(trackedUserId!),
    enabled: !!trackedUserId,
    staleTime: 5 * 60 * 1000,
  });

  const error = queryError as Error | null;

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    if (!userId) return null;
    setTrackedUserId(userId);
    try {
      await queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      return await queryClient.fetchQuery({
        queryKey: ['profile', userId],
        queryFn: () => fetchOwnProfile(userId),
        staleTime: 0,
      });
    } catch {
      return null;
    }
  }, [queryClient]);

  const applyProfilePatch = useCallback((userId: string, patch: Record<string, unknown>) => {
    queryClient.setQueryData<UserProfile>(['profile', userId], (current) => {
      if (!current) return current;
      return normalizeProfileFromApi({ ...current, ...patch }, userId);
    });
  }, [queryClient]);

  const clearProfile = useCallback(() => {
    if (trackedUserId) queryClient.removeQueries({ queryKey: ['profile', trackedUserId] });
    setTrackedUserId(null);
  }, [queryClient, trackedUserId]);

  return { profile, loading, error, fetchProfile, applyProfilePatch, clearProfile };
};
