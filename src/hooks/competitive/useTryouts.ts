import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { competitiveApiClient as apiClient } from '@/hooks/competitive/competitiveApiClient';
import type {
  TryoutSession,
  TryoutParticipant,
  TryoutEvaluation,
  TryoutSessionStatus,
  CreateTryoutSessionRequest,
  SubmitEvaluationRequest,
  TryoutInviteView,
} from '@/types/competitive';

export const tryoutKeys = {
  teamSessions: (teamId: string) => ['tryouts', 'team', teamId] as const,
  session: (id: string) => ['tryouts', 'session', id] as const,
  participants: (sessionId: string) => ['tryouts', 'participants', sessionId] as const,
  evaluations: (sessionId: string) => ['tryouts', 'evaluations', sessionId] as const,
  myInvites: () => ['tryouts', 'my-invites'] as const,
};

export function useTeamTryoutSessions(teamId: string, status?: TryoutSessionStatus) {
  const params = new URLSearchParams({ team_id: teamId });
  if (status) params.set('status', status);
  return useQuery({
    queryKey: tryoutKeys.teamSessions(teamId),
    queryFn: () => apiClient.get<TryoutSession[]>(`/api/tryouts/sessions?${params.toString()}`),
    enabled: !!teamId,
    staleTime: 30_000,
  });
}

export function useTryoutSession(id: string) {
  return useQuery({
    queryKey: tryoutKeys.session(id),
    queryFn: () => apiClient.get<TryoutSession>(`/api/tryouts/sessions/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateTryoutSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateTryoutSessionRequest) =>
      apiClient.post<TryoutSession>('/api/tryouts/sessions', {
        team_id: req.teamId,
        title: req.title,
        game_slug: req.gameSlug,
        description: req.description,
        scheduled_at: req.scheduledAt,
        duration_minutes: req.durationMinutes,
        max_participants: req.maxParticipants,
        min_rank_key: req.minRankKey,
        max_rank_key: req.maxRankKey,
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: tryoutKeys.teamSessions(variables.teamId) });
    },
  });
}

export function useUpdateTryoutSession(id: string, teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: Partial<CreateTryoutSessionRequest>) =>
      apiClient.put<TryoutSession>(`/api/tryouts/sessions/${id}`, {
        title: req.title,
        game_slug: req.gameSlug,
        description: req.description,
        scheduled_at: req.scheduledAt,
        duration_minutes: req.durationMinutes,
        max_participants: req.maxParticipants,
      }),
    onSuccess: (updated) => {
      qc.setQueryData(tryoutKeys.session(id), updated);
      qc.invalidateQueries({ queryKey: tryoutKeys.teamSessions(teamId) });
    },
  });
}

function useSessionAction(id: string, action: string, teamId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<TryoutSession>(`/api/tryouts/sessions/${id}/${action}`),
    onSuccess: (updated) => {
      qc.setQueryData(tryoutKeys.session(id), updated);
      if (teamId) {
        qc.invalidateQueries({ queryKey: tryoutKeys.teamSessions(teamId) });
      }
    },
  });
}

export function useStartSession(id: string, teamId?: string) {
  return useSessionAction(id, 'start', teamId);
}

export function useCompleteSession(id: string, teamId?: string) {
  return useSessionAction(id, 'complete', teamId);
}

export function useCancelSession(id: string, teamId?: string) {
  return useSessionAction(id, 'cancel', teamId);
}

export function useInviteParticipant(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      apiClient.post<TryoutParticipant>(`/api/tryouts/sessions/${sessionId}/invite`, {
        user_id: userId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tryoutKeys.participants(sessionId) });
    },
  });
}

export function useRespondToInvite(sessionId: string, userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (response: 'confirmed' | 'declined') =>
      apiClient.put<TryoutParticipant>(
        `/api/tryouts/sessions/${sessionId}/participants/${userId}/respond`,
        { response },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tryoutKeys.myInvites() });
      qc.invalidateQueries({ queryKey: tryoutKeys.participants(sessionId) });
    },
  });
}

export function useSessionParticipants(sessionId: string) {
  return useQuery({
    queryKey: tryoutKeys.participants(sessionId),
    queryFn: () =>
      apiClient.get<TryoutParticipant[]>(`/api/tryouts/sessions/${sessionId}/participants`),
    enabled: !!sessionId,
    staleTime: 30_000,
  });
}

export function useSubmitEvaluation(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: SubmitEvaluationRequest) =>
      apiClient.post<TryoutEvaluation>(`/api/tryouts/sessions/${sessionId}/evaluations`, {
        evaluatee_user_id: req.evaluateeUserId,
        overall_score: req.overallScore,
        communication: req.communication,
        mechanics: req.mechanics,
        game_sense: req.gameSense,
        attitude: req.attitude,
        teamwork: req.teamwork,
        peak_play: req.peakPlay,
        consistency: req.consistency,
        notes: req.notes,
        recommendation: req.recommendation,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tryoutKeys.evaluations(sessionId) });
    },
  });
}

export function useSessionEvaluations(sessionId: string) {
  return useQuery({
    queryKey: tryoutKeys.evaluations(sessionId),
    queryFn: () =>
      apiClient.get<TryoutEvaluation[]>(`/api/tryouts/sessions/${sessionId}/evaluations`),
    enabled: !!sessionId,
    staleTime: 30_000,
  });
}

export function useMyTryoutInvites() {
  return useQuery({
    queryKey: tryoutKeys.myInvites(),
    queryFn: () => apiClient.get<TryoutInviteView[]>('/api/tryouts/my-invites'),
    staleTime: 30_000,
  });
}
