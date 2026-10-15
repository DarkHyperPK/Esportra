import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/lib/apiClient';
import { rundownPlanSchema, type RundownPlan } from '@/schemas/rundownPlanSchema';
import { segmentsQueryKey } from './useBroadcastShowSegments';
const templatesSchema = z.array(z.object({ id: z.enum(['bo1', 'bo3']), name: z.string(), bestOf: z.number().int(), items: z.array(z.object({ title: z.string(), type: z.string(), overlay: z.string(), plan: rundownPlanSchema })) }));
export function useRundownTemplates() {
  return useQuery({ queryKey: ['broadcast-rundown-templates'], queryFn: async () => templatesSchema.parse(await apiClient.get<unknown>('/api/broadcast/rundown/templates')), staleTime: 300000, retry: false });
}
export function useRundownPlanWrites(showId: string) {
  const client = useQueryClient();
  const refresh = async () => { await client.invalidateQueries({ queryKey: segmentsQueryKey(showId) }); void client.invalidateQueries({ queryKey: ['broadcast-configuration', showId] }); };
  const importTemplate = useMutation({ mutationFn: (input: { matchId: string; template: 'bo1' | 'bo3'; requestId: string }) => apiClient.post<{ count: number; alreadyImported: boolean }>(`/api/broadcast/shows/${showId}/rundown/templates`, z.object({ matchId: z.string().uuid(), template: z.enum(['bo1', 'bo3']), requestId: z.string().uuid() }).parse(input)), onSuccess: refresh });
  const savePlan = useMutation({ mutationFn: (input: { segmentId: string; plan: RundownPlan }) => apiClient.put(`/api/broadcast/shows/${showId}/segments/${z.string().uuid().parse(input.segmentId)}/plan`, rundownPlanSchema.parse(input.plan)), onSuccess: refresh });
  return { importTemplate, savePlan };
}
