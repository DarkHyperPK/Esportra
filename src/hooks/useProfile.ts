import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { UserProfile, UserRole } from '@/types/auth';

export const useProfile = () => {
  const queryClient = useQueryClient();
  const [trackedUserId, setTrackedUserId] = useState<string | null>(null);

  const { data: profile = null, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['profile', trackedUserId],
    queryFn: async () => {
      const data = await apiClient.get<UserProfile>(`/api/profiles/${trackedUserId}`);
      const role: UserRole = (data as any).role ?? 'casual';
      return { ...data, role } as UserProfile;
    },
    enabled: !!trackedUserId,
    staleTime: 5 * 60 * 1000,
  });

  const error = queryError as Error | null;

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    if (!userId) return null;
    setTrackedUserId(userId);
    try {
      return await queryClient.fetchQuery({
        queryKey: ['profile', userId],
        queryFn: async () => {
          const data = await apiClient.get<UserProfile>(`/api/profiles/${userId}`);
          const role: UserRole = (data as any).role ?? 'casual';
          return { ...data, role } as UserProfile;
        },
        staleTime: 5 * 60 * 1000,
      });
    } catch {
      return null;
    }
  }, [queryClient]);

  const clearProfile = useCallback(() => {
    if (trackedUserId) queryClient.removeQueries({ queryKey: ['profile', trackedUserId] });
    setTrackedUserId(null);
  }, [queryClient, trackedUserId]);

  return { profile, loading, error, fetchProfile, clearProfile };
};
