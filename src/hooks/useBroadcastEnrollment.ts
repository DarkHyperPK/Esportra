import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/lib/apiClient';
const enrollmentSchema = z.object({ enabled: z.boolean(), stageIds: z.array(z.string().uuid()), revision: z.number().int().nonnegative(), checkedAt: z.string().nullable(), error: z.string().nullable().optional(), atCapacity: z.boolean(), stages: z.array(z.object({ id: z.string().uuid(), name: z.string() })) });
export function useBroadcastEnrollment(showId: string) {
  const client = useQueryClient(), key = ['broadcast-enrollment', showId];
  const query = useQuery({ queryKey: key, queryFn: async () => enrollmentSchema.parse(await apiClient.get<unknown>(`/api/broadcast/shows/${showId}/enrollment`)), enabled: !!showId, retry: false, refetchInterval: 10000 });
  const save = useMutation({ mutationFn: (input: { enabled: boolean; stageIds: string[]; revision: number }) => apiClient.put<{ added: number; atCapacity: boolean; revision: number }>(`/api/broadcast/shows/${showId}/enrollment`, z.object({ enabled: z.boolean(), stageIds: z.array(z.string().uuid()).max(100), revision: z.number().int().nonnegative() }).parse(input)), onSuccess: async () => { await client.invalidateQueries({ queryKey: key }); void client.invalidateQueries({ queryKey: ['broadcast-show', showId] }); void client.invalidateQueries({ queryKey: ['broadcast-available-matches', showId] }); } });
  return { query, save };
}
