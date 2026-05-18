import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type {
  CreateInvitationsRequest,
  RedeemInvitationRequest,
  RedeemInvitationResponse,
  SendInvitationsRequest,
  TournamentInvitation,
} from '@/types/invitation';

const mapInvitation = (value: any): TournamentInvitation => ({
  id: value.id,
  tournamentId: value.tournamentId ?? value.tournament_id,
  email: value.email,
  code: value.code ?? null,
  status: value.status,
  teamId: value.teamId ?? value.team_id ?? null,
  teamName: value.teamName ?? value.team_name ?? null,
  sentAt: value.sentAt ?? value.sent_at ?? null,
  redeemedAt: value.redeemedAt ?? value.redeemed_at ?? null,
  expiresAt: value.expiresAt ?? value.expires_at,
  createdAt: value.createdAt ?? value.created_at,
});

const extractInvitations = (response: any): TournamentInvitation[] => {
  const rows = Array.isArray(response)
    ? response
    : Array.isArray(response?.invitations)
      ? response.invitations
      : Array.isArray(response?.items)
        ? response.items
        : [];
  return rows.map(mapInvitation);
};

export function useTournamentInvitations(tournamentId?: string | null, options: { list?: boolean } = {}) {
  const queryClient = useQueryClient();
  const queryKey = ['tournament-invitations', tournamentId];

  const invitations = useQuery({
    queryKey,
    queryFn: async () => {
      if (!tournamentId) return [];
      const response = await apiClient.get(`/api/tournaments/${tournamentId}/invitations`);
      return extractInvitations(response);
    },
    enabled: Boolean(tournamentId) && options.list !== false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const createDrafts = useMutation({
    mutationFn: async (payload: CreateInvitationsRequest) => {
      if (!tournamentId) throw new Error('Tournament is required.');
      const response = await apiClient.post(`/api/tournaments/${tournamentId}/invitations/draft`, payload);
      return extractInvitations(response);
    },
    onSuccess: invalidate,
  });

  const sendInvites = useMutation({
    mutationFn: async (payload: SendInvitationsRequest = {}) => {
      if (!tournamentId) throw new Error('Tournament is required.');
      const response = await apiClient.post(`/api/tournaments/${tournamentId}/invitations/send`, payload);
      return extractInvitations(response);
    },
    onSuccess: invalidate,
  });

  const revokeInvite = useMutation({
    mutationFn: async (invitationId: string) => {
      await apiClient.delete(`/api/invitations/${invitationId}`);
    },
    onSuccess: invalidate,
  });

  const redeemCode = useMutation({
    mutationFn: async (payload: RedeemInvitationRequest) => {
      return apiClient.post<RedeemInvitationResponse>('/api/invitations/redeem', payload);
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['tournament-participants'] });
    },
  });

  const resendInvites = useMutation({
    mutationFn: async (payload: { invitationIds: string[] }) => {
      if (!tournamentId) throw new Error('Tournament is required.');
      const response = await apiClient.post(`/api/tournaments/${tournamentId}/invitations/resend`, payload);
      return response as { resent_count: number; invitations: any[] };
    },
    onSuccess: invalidate,
  });

  const importCsv = useMutation({
    mutationFn: async (payload: { csvContent: string }) => {
      if (!tournamentId) throw new Error('Tournament is required.');
      const response = await apiClient.post(`/api/tournaments/${tournamentId}/invitations/import-csv`, payload);
      return response as { imported: number; skipped: number; capped: number; inviteIds: string[] };
    },
    onSuccess: invalidate,
  });

  const fetchStats = async () => {
    if (!tournamentId) return null;
    return apiClient.get<{ stats: any; reserved_slots: number }>(`/api/tournaments/${tournamentId}/invitations/stats`);
  };

  return {
    invitations,
    createDrafts,
    sendInvites,
    revokeInvite,
    redeemCode,
    resendInvites,
    importCsv,
    fetchStats,
  };
}
