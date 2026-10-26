import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { competitiveApiClient as apiClient } from '@/hooks/competitive/competitiveApiClient';
import type {
  ScoutingShortlist,
  ShortlistEntry,
  ScoutingNote,
  CreateShortlistRequest,
  UpsertScoutingNoteRequest,
} from '@/types/competitive';

export const scoutingKeys = {
  myShortlists: () => ['scouting', 'shortlists', 'mine'] as const,
  shortlist: (id: string) => ['scouting', 'shortlists', id] as const,
  note: (subjectUserId: string) => ['scouting', 'notes', subjectUserId] as const,
};

export function useMyShortlists() {
  return useQuery({
    queryKey: scoutingKeys.myShortlists(),
    queryFn: () => apiClient.get<ScoutingShortlist[]>('/api/scouting/shortlists'),
    staleTime: 30_000,
  });
}

export function useShortlistDetail(id: string) {
  return useQuery({
    queryKey: scoutingKeys.shortlist(id),
    queryFn: () =>
      apiClient.get<ScoutingShortlist & { entries: ShortlistEntry[] }>(
        `/api/scouting/shortlists/${id}`,
      ),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateShortlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateShortlistRequest) =>
      apiClient.post<ScoutingShortlist>('/api/scouting/shortlists', req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scoutingKeys.myShortlists() });
    },
  });
}

export function useUpdateShortlist(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: Partial<CreateShortlistRequest>) =>
      apiClient.put<ScoutingShortlist>(`/api/scouting/shortlists/${id}`, req),
    onSuccess: (updated) => {
      qc.setQueryData(scoutingKeys.shortlist(id), updated);
      qc.invalidateQueries({ queryKey: scoutingKeys.myShortlists() });
    },
  });
}

export function useDeleteShortlist(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete(`/api/scouting/shortlists/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scoutingKeys.myShortlists() });
      qc.removeQueries({ queryKey: scoutingKeys.shortlist(id) });
    },
  });
}

export function useAddToShortlist(shortlistId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ playerUserId, note }: { playerUserId: string; note?: string }) =>
      apiClient.post<ShortlistEntry>(`/api/scouting/shortlists/${shortlistId}/entries`, {
        playerUserId,
        note,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scoutingKeys.shortlist(shortlistId) });
      qc.invalidateQueries({ queryKey: scoutingKeys.myShortlists() });
    },
  });
}

export function useRemoveFromShortlist(shortlistId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (playerId: string) =>
      apiClient.delete(`/api/scouting/shortlists/${shortlistId}/entries/${playerId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scoutingKeys.shortlist(shortlistId) });
      qc.invalidateQueries({ queryKey: scoutingKeys.myShortlists() });
    },
  });
}

export function useScoutingNote(subjectUserId: string) {
  return useQuery({
    queryKey: scoutingKeys.note(subjectUserId),
    queryFn: () => apiClient.get<ScoutingNote>(`/api/scouting/notes/${subjectUserId}`),
    enabled: !!subjectUserId,
    staleTime: 30_000,
    retry: (failureCount, error) => {
      if ((error as { status?: number })?.status === 404) return false;
      return failureCount < 2;
    },
  });
}

export function useUpsertScoutingNote(subjectUserId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: UpsertScoutingNoteRequest) =>
      apiClient.put<ScoutingNote>(`/api/scouting/notes/${subjectUserId}`, req),
    onSuccess: (updated) => {
      qc.setQueryData(scoutingKeys.note(subjectUserId), updated);
    },
  });
}

export function useDeleteScoutingNote(subjectUserId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete(`/api/scouting/notes/${subjectUserId}`),
    onSuccess: () => {
      qc.removeQueries({ queryKey: scoutingKeys.note(subjectUserId) });
    },
  });
}
