import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { competitiveApiClient as apiClient } from '@/hooks/competitive/competitiveApiClient';
import type {
  RecruitmentOpening,
  RecruitmentApplication,
  RecruitmentApplicationStatus,
  CreateRecruitmentOpeningRequest,
} from '@/types/competitive';

export const recruitmentKeys = {
  discover: (game: string) => ['recruitment', 'discover', game] as const,
  teamOpenings: (teamId: string) => ['recruitment', 'team', teamId] as const,
  opening: (id: string) => ['recruitment', 'opening', id] as const,
  applications: (openingId: string) => ['recruitment', 'applications', openingId] as const,
  mine: () => ['recruitment', 'mine'] as const,
};

export function useDiscoverOpenings(game: string) {
  return useQuery({
    queryKey: recruitmentKeys.discover(game),
    queryFn: () => apiClient.get<RecruitmentOpening[]>(`/api/recruitment/openings/discover?game=${game}`),
    enabled: !!game,
    staleTime: 30_000,
  });
}

export function useTeamOpenings(teamId: string) {
  return useQuery({
    queryKey: recruitmentKeys.teamOpenings(teamId),
    queryFn: () => apiClient.get<RecruitmentOpening[]>(`/api/recruitment/openings?team_id=${teamId}`),
    enabled: !!teamId,
    staleTime: 30_000,
  });
}

export function useRecruitmentOpening(id: string) {
  return useQuery({
    queryKey: recruitmentKeys.opening(id),
    queryFn: () => apiClient.get<RecruitmentOpening>(`/api/recruitment/openings/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateOpening() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateRecruitmentOpeningRequest) =>
      apiClient.post<RecruitmentOpening>('/api/recruitment/openings', req),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.teamOpenings(variables.teamId) });
    },
  });
}

export function useUpdateOpening(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: Partial<CreateRecruitmentOpeningRequest>) =>
      apiClient.put<RecruitmentOpening>(`/api/recruitment/openings/${id}`, req),
    onSuccess: (updated) => {
      qc.setQueryData(recruitmentKeys.opening(id), updated);
    },
  });
}

export function usePublishOpening(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<RecruitmentOpening>(`/api/recruitment/openings/${id}/publish`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruitment', 'team'] });
      qc.invalidateQueries({ queryKey: recruitmentKeys.opening(id) });
    },
  });
}

export function usePauseOpening(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<RecruitmentOpening>(`/api/recruitment/openings/${id}/pause`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruitment', 'team'] });
      qc.invalidateQueries({ queryKey: recruitmentKeys.opening(id) });
    },
  });
}

export function useCloseOpening(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<RecruitmentOpening>(`/api/recruitment/openings/${id}/close`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruitment', 'team'] });
      qc.invalidateQueries({ queryKey: recruitmentKeys.opening(id) });
    },
  });
}

export function useApplyToOpening(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (coverLetter?: string) =>
      apiClient.post<RecruitmentApplication>(`/api/recruitment/openings/${id}/apply`, {
        cover_letter: coverLetter,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.mine() });
    },
  });
}

export function useOpeningApplications(openingId: string) {
  return useQuery({
    queryKey: recruitmentKeys.applications(openingId),
    queryFn: () =>
      apiClient.get<RecruitmentApplication[]>(`/api/recruitment/openings/${openingId}/applications`),
    enabled: !!openingId,
    staleTime: 30_000,
  });
}

export function useUpdateApplicationStatus(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ status, note }: { status: RecruitmentApplicationStatus; note?: string }) =>
      apiClient.put<RecruitmentApplication>(
        `/api/recruitment/applications/${applicationId}/status`,
        { status, note },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruitment', 'applications'] });
      qc.invalidateQueries({ queryKey: recruitmentKeys.mine() });
    },
  });
}

export function useMyApplications() {
  return useQuery({
    queryKey: recruitmentKeys.mine(),
    queryFn: () => apiClient.get<RecruitmentApplication[]>('/api/recruitment/applications/mine'),
    staleTime: 30_000,
  });
}
