import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { competitiveApiClient } from '@/hooks/competitive/competitiveApiClient';
import { providerMatchKeys } from '@/hooks/competitive/queryKeys';
import { analyticsVisibilityRequestSchema, analyticsVisibilitySchema } from '@/schemas/providerMatch';
import type { AnalyticsVisibility, AnalyticsVisibilitySetting } from '@/types/providerMatch';

/** Who can see a player's Riot-derived analytics. Private until the player says otherwise. */
export function useAnalyticsVisibility(game = 'valorant') {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = providerMatchKeys.visibility(game);

  const query = useQuery({
    queryKey: key,
    queryFn: async () =>
      analyticsVisibilitySchema.parse(await competitiveApiClient.get<unknown>(`/api/competitive/analytics-visibility?game=${encodeURIComponent(game)}`)),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: async (visibility: AnalyticsVisibility) => {
      const body = analyticsVisibilityRequestSchema.parse({ game, visibility });
      return analyticsVisibilitySchema.parse(await competitiveApiClient.put<unknown>('/api/competitive/analytics-visibility', body));
    },
    // Snapshot, apply, roll back on failure; the caller shows the error.
    onMutate: async (visibility) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<AnalyticsVisibilitySetting>(key);
      queryClient.setQueryData<AnalyticsVisibilitySetting>(key, { game, visibility });
      return { previous };
    },
    onError: (_error, _visibility, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      else void queryClient.invalidateQueries({ queryKey: key });
    },
    onSuccess: (saved) => queryClient.setQueryData(key, saved),
  });

  return {
    visibility: query.data?.visibility ?? 'private',
    isLoading: query.isLoading,
    isSaving: mutation.isPending,
    save: mutation.mutateAsync,
  };
}
