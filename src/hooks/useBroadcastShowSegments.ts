/**
 * Segment CRUD via Supabase RLS.
 * No backend REST endpoint exists for rundown_segments — we call
 * Supabase JS directly. The authenticated user has SELECT/INSERT/UPDATE/DELETE
 * via RLS policies on the rundown_segments table.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ShowSegment, SegmentType } from '@/types/broadcast';
import { addSegmentSchema, updateSegmentSchema } from '@/schemas/broadcastSchema';

export const segmentsQueryKey = (showId: string) =>
  ['broadcast-show-segments', showId] as const;

export function useBroadcastShowSegments(showId: string | undefined) {
  return useQuery({
    queryKey: segmentsQueryKey(showId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rundown_segments')
        .select('id, show_id, type, title, estimated_duration, status, display_order, notes')
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
          estimatedDuration: (row.estimated_duration as string | null) ?? null,
          status: (row.status as ShowSegment['status']) ?? 'pending',
          displayOrder: row.display_order as number,
          notes: (row.notes as string | null) ?? null,
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
          estimated_duration: parsed.estimatedDuration || null,
          notes: parsed.notes || null,
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
        patch.estimated_duration = parsed.estimatedDuration || null;
      if (parsed.notes !== undefined) patch.notes = parsed.notes || null;

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

      for (const u of updates) {
        const { error } = await supabase
          .from('rundown_segments')
          .update({ display_order: u.display_order })
          .eq('id', u.id)
          .eq('show_id', showId);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: segmentsQueryKey(showId) });
    },
  });
}
