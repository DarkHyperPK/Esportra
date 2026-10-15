import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/lib/apiClient';
const planSchema = z.object({ showId: z.string().uuid(), version: z.number().int().nonnegative(), pendingVersion: z.number().int().positive().nullable().optional() });
const publicationSchema = z.object({
  version: z.number().int().nonnegative(), publishedAt: z.string().nullable(),
  rundown: z.array(z.object({ id: z.string(), title: z.string() })),
  nodes: z.array(z.object({ id: z.string().uuid(), name: z.string(), seenAt: z.string().nullable(), plan: z.string().nullable().transform(value => { try { return value ? planSchema.parse(JSON.parse(value)) : null; } catch { return null; } }) })),
});
export function useRundownPublication(showId: string) {
  return useQuery({ queryKey: ['broadcast-publication', showId], queryFn: async () => publicationSchema.parse(await apiClient.get<unknown>(`/api/broadcast/shows/${showId}/publication`)), enabled: !!showId, refetchInterval: 5000, retry: false });
}
