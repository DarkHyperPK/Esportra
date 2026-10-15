/**
 * Segment CRUD via Supabase RLS.
 * CRUD uses Supabase JS directly; bulk reorder uses an atomic backend endpoint.
 * The authenticated user has SELECT/INSERT/UPDATE/DELETE
 * via RLS policies on the rundown_segments table.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ShowSegment, SegmentType } from '@/types/broadcast';
import { addSegmentSchema, updateSegmentSchema } from '@/schemas/broadcastSchema';
import { parseRundownDuration, formatRundownDuration } from '@/services/broadcast/rundownDuration';
import type { Json } from '@/integrations/supabase/types';
import { apiClient } from '@/lib/apiClient';
import { readRundownPlan } from '@/schemas/rundownPlanSchema';

function segmentNotes(config: Json | null): string | null {
  return config && typeof config === 'object' && !Array.isArray(config) && typeof config.notes === 'string' ? config.notes : null;
}

export const segmentsQueryKey = (showId: string) =>
  ['broadcast-show-segments', showId] as const;

export function useBroadcastShowSegments(showId: string | undefined) {
  return useQuery({
    queryKey: segmentsQueryKey(showId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rundown_segments')
        .select('id, show_id, type, title, duration_seconds, status, display_order, config')
        .eq('show_id', showId)
        .order('display_order', { ascending: true })
        .limit(200);

      if (error) throw new Error(error.message);

      return (data ?? []).map(
        (row): ShowSegment => ({
          id: row.id as string,
          showId: row.show_id as string,
          type: row.type as SegmentType,
          title: row.title as string,
          estimatedDuration: formatRundownDuration(row.duration_seconds),
          status: (row.status as ShowSegment['status']) ?? 'pending',
          displayOrder: row.display_order as number,
          notes: segmentNotes(row.config),
          overlay: row.config && typeof row.config === 'object' && !Array.isArray(row.config) && typeof row.config.overlay === 'string' ? row.config.overlay : null,
          matchId: row.config && typeof row.config === 'object' && !Array.isArray(row.config) && typeof row.config.matchId === 'string' ? row.config.matchId : null,
          plan: readRundownPlan(row.config && typeof row.config === 'object' && !Array.isArray(row.config) ? row.config.plan : null),
        }),
      );
    },
    enabled: !!showId,
    staleTime: 20_000,
  });
}

export function useAddSegment(showId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      type: SegmentType;
      title: string;
      estimatedDuration?: string;
      notes?: string;
      displayOrder?: number;
    }) => {
      const parsed = addSegmentSchema.parse(input);
      const { data, error } = await supabase
        .from('rundown_segments')
        .insert({
          show_id: showId,
          type: parsed.type,
          title: parsed.title,
          duration_seconds: parseRundownDuration(parsed.estimatedDuration),
          config: { notes: parsed.notes || '' },
          display_order: parsed.displayOrder ?? 0,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: segmentsQueryKey(showId) });
    },
  });
}

export function useUpdateSegment(showId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<ShowSegment> & { id: string }) => {
      const parsed = updateSegmentSchema.parse(input);
      const patch: Record<string, unknown> = {};
      if (parsed.type !== undefined) patch.type = parsed.type;
      if (parsed.title !== undefined) patch.title = parsed.title;
      if (parsed.estimatedDuration !== undefined)
        patch.duration_seconds = parseRundownDuration(parsed.estimatedDuration);
      if (parsed.notes !== undefined || parsed.type !== undefined) {
        const { data: existing, error: readError } = await supabase.from('rundown_segments').select('config').eq('id', parsed.id).eq('show_id', showId).single();
        if (readError) throw readError;
        const previous = existing.config && typeof existing.config === 'object' && !Array.isArray(existing.config) ? existing.config : {};
        // A manual type change deliberately switches to the existing type-based scene layout.
        // Keep notes and match ownership; discard the previously selected screen override.
        patch.config = { ...previous,
          ...(parsed.notes !== undefined ? { notes: parsed.notes || '' } : {}),
          ...(parsed.type !== undefined ? { overlay: null, plan: null } : {}),
        };
      }

      const { error } = await supabase
        .from('rundown_segments')
        .update(patch)
        .eq('id', parsed.id)
        .eq('show_id', showId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: segmentsQueryKey(showId) });
    },
  });
}

export function useRemoveSegment(showId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (segmentId: string) => {
      const { error } = await supabase
        .from('rundown_segments')
        .delete()
        .eq('id', segmentId)
        .eq('show_id', showId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: segmentsQueryKey(showId) });
    },
  });
}

export function useReorderSegments(showId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (segments: ShowSegment[]) => {
      const updates = segments.map((s, i) => ({
        id: s.id,
        display_order: i,
      }));

      await apiClient.post(`/api/broadcast/shows/${showId}/segments/reorder`, { segmentIds: updates.map(item => item.id) });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: segmentsQueryKey(showId) });
    },
  });
}
