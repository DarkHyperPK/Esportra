import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { CompetitiveProfile, UpsertCompetitiveProfileRequest } from '@/types/competitive';

export function competitiveProfileKey(userId: string, gameSlug: string) {
  return ['competitive-profile', userId, gameSlug] as const;
}

/**
 * Fetches the competitive game profile for a given user + game.
 * Returns null (not an error) when the player has not set one up.
 * The backend returns 404 when profile_visible=false for non-owners — callers
 * should treat a missing profile as "section hidden" rather than an error.
 */
export function useCompetitiveProfile(userId: string, gameSlug: string) {
  return useQuery({
    queryKey: competitiveProfileKey(userId, gameSlug),
    queryFn: async () => {
      try {
        return await apiClient.get<CompetitiveProfile>(
          `/api/competitive/profiles/${userId}?game=${gameSlug}`,
        );
      } catch {
        // 404 = no profile or private — return null, section hidden
        return null;
      }
    },
    enabled: !!userId && !!gameSlug,
    staleTime: 60_000,
  });
}

/** Create or update the authenticated user's competitive profile for a game. */
export function useUpsertCompetitiveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: UpsertCompetitiveProfileRequest) =>
      apiClient.put<CompetitiveProfile>('/api/competitive/profiles', req),
    onSuccess: (updated) => {
      qc.setQueryData(
        competitiveProfileKey(updated.userId, updated.gameSlug),
        updated,
      );
    },
  });
}
