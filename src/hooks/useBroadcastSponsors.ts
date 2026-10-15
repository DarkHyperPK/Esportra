import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { supabase } from '@/lib/supabase';
import type { BroadcastSponsor } from '@/types/broadcast';
import { addSponsorSchema, editSponsorSchema, type AddSponsorInput } from '@/schemas/broadcastSchema';

export const sponsorsQueryKey = (showId: string) =>
  ['broadcast-sponsors', showId] as const;

export function useBroadcastSponsors(showId: string | undefined) {
  return useQuery({
    queryKey: sponsorsQueryKey(showId ?? ''),
    queryFn: () =>
      apiClient.get<BroadcastSponsor[]>(
        `/api/broadcast/shows/${showId}/sponsors`,
      ),
    enabled: !!showId,
    staleTime: 30_000,
  });
}

export function useAddSponsor(showId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddSponsorInput) => {
      const parsed = addSponsorSchema.parse(input);
      return apiClient.post<{ sponsorId: string }>(
        `/api/broadcast/shows/${showId}/sponsors`,
        parsed,
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sponsorsQueryKey(showId) });
    },
  });
}

export function useEditSponsor(showId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string } & AddSponsorInput) => {
      const parsed = editSponsorSchema.parse(input);
      return apiClient.patch<{ success: true }>(
        `/api/broadcast/shows/${showId}/sponsors/${parsed.id}`,
        parsed,
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sponsorsQueryKey(showId) });
    },
  });
}

export function useDeleteSponsor(showId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (sponsorId: string) =>
      apiClient.delete(
        `/api/broadcast/shows/${showId}/sponsors/${sponsorId}`,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sponsorsQueryKey(showId) });
    },
  });
}

export function useToggleSponsor(showId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      sponsorId,
      isActive,
    }: {
      sponsorId: string;
      isActive: boolean;
    }) =>
      apiClient.patch<{ success: true }>(
        `/api/broadcast/shows/${showId}/sponsors/${sponsorId}`,
        { isActive },
      ),
    onMutate: async ({ sponsorId, isActive }) => {
      await qc.cancelQueries({ queryKey: sponsorsQueryKey(showId) });
      const previous = qc.getQueryData<BroadcastSponsor[]>(
        sponsorsQueryKey(showId),
      );
      qc.setQueryData<BroadcastSponsor[]>(
        sponsorsQueryKey(showId),
        (old) =>
          old?.map((s) =>
            s.id === sponsorId ? { ...s, isActive } : s,
          ) ?? [],
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(sponsorsQueryKey(showId), ctx.previous);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: sponsorsQueryKey(showId) });
    },
  });
}

export function useReorderSponsors(showId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (sponsors: BroadcastSponsor[]) =>
      apiClient.patch<{ success: true }>(
        `/api/broadcast/shows/${showId}/sponsors/reorder`,
        { order: sponsors.map((s) => s.id) },
      ),
    onMutate: async (sponsors) => {
      await qc.cancelQueries({ queryKey: sponsorsQueryKey(showId) });
      const previous = qc.getQueryData<BroadcastSponsor[]>(
        sponsorsQueryKey(showId),
      );
      qc.setQueryData<BroadcastSponsor[]>(
        sponsorsQueryKey(showId),
        sponsors.map((s, i) => ({ ...s, displayOrder: i })),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(sponsorsQueryKey(showId), ctx.previous);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: sponsorsQueryKey(showId) });
    },
  });
}

/** Upload a sponsor logo to Supabase Storage. Returns the public URL. */
export async function uploadSponsorLogo(
  file: File,
  showId: string,
  sponsorId: string,
): Promise<string> {
  const types: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
  const ext = types[file.type];
  if (!ext || file.size <= 0 || file.size > 5 * 1024 * 1024 || !/\.(png|jpe?g|webp)$/i.test(file.name)) throw new Error('Choose a PNG, JPG or WebP logo up to 5 MB.');
  if (!/^[0-9a-f-]{36}$/i.test(showId) || !/^(?:[0-9a-f-]{36}|temp-\d+)$/i.test(sponsorId)) throw new Error('Invalid sponsor upload destination.');
  const path = `${showId}/${sponsorId}.${ext}`;

  const { error } = await supabase.storage
    .from('broadcast-sponsors')
    .upload(path, file, { upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage
    .from('broadcast-sponsors')
    .getPublicUrl(path);

  return data.publicUrl;
}
