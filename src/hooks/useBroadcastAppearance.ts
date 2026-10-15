import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { broadcastAppearanceSchema, type BroadcastAppearance } from '@/schemas/broadcastAppearanceSchema';
export function useBroadcastAppearance(showId: string) {
  const client = useQueryClient(), key = ['broadcast-appearance', showId];
  const query = useQuery({ queryKey: key, queryFn: async () => broadcastAppearanceSchema.parse(await apiClient.get<unknown>(`/api/broadcast/shows/${showId}/appearance`)), enabled: !!showId, retry: false });
  const save = useMutation({ mutationFn: async (appearance: BroadcastAppearance) => broadcastAppearanceSchema.parse(await apiClient.put<unknown>(`/api/broadcast/shows/${showId}/appearance`, broadcastAppearanceSchema.parse(appearance))), onSuccess: data => { client.setQueryData(key, data); void client.invalidateQueries({ queryKey: ['broadcast-configuration', showId] }); } });
  return { query, save };
}
