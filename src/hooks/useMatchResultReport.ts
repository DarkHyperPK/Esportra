import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useMatchRealtime } from '@/hooks/useMatchRealtime';

export interface MatchResultReport {
  id: string;
  match_id: string;
  game_number: number;
  reported_by: string;
  reported_by_team_id: string;
  riot_match_id: string;
  map_id: string | null;
  map_name: string | null;
  team1_score: number;
  team2_score: number;
  winner_team_id: string | null;
  match_data: any;
  screenshot_urls: string[] | null;
  comment: string | null;
  status: 'pending' | 'accepted' | 'disputed';
  responded_by: string | null;
  responded_at: string | null;
  dispute_reason: string | null;
  created_at: string;
}

export const useMatchResultReport = (
  matchId: string | undefined,
  gameNumber?: number,
  options?: { subscribeRealtime?: boolean },
) => {
  const subscribeRealtime = options?.subscribeRealtime !== false;
  const queryClient = useQueryClient();
  const { toast }   = useToast();
  const { user }    = useAuth();

  // Fetch reports via .NET API
  const { data: reports, isLoading } = useQuery<MatchResultReport[]>({
    queryKey: ['match-result-reports', matchId],
    queryFn: () => apiClient.get<MatchResultReport[]>(`/api/matches/${matchId}/reports`),
    enabled: !!matchId,
    staleTime: 10_000,
  });

  const activeReport   = reports?.find((r) => r.status === 'pending'  && (!gameNumber || r.game_number === gameNumber)) ?? null;
  const acceptedReport = reports?.find((r) => r.status === 'accepted' && (!gameNumber || r.game_number === gameNumber)) ?? null;
  const isMyReport     = activeReport?.reported_by === user?.id;

  // Live updates via SignalR MatchHub (invalidates cache on any match event)
  useMatchRealtime({
    matchId,
    enabled: subscribeRealtime && !!matchId,
    onReportSubmitted: () => queryClient.invalidateQueries({ queryKey: ['match-result-reports', matchId] }),
    onReportAccepted:  () => {
      queryClient.invalidateQueries({ queryKey: ['match-result-reports', matchId] });
      queryClient.invalidateQueries({ queryKey: ['bracket'] });
      queryClient.invalidateQueries({ queryKey: ['captain-all-matches'] });
    },
    onReportDisputed:  () => {
      queryClient.invalidateQueries({ queryKey: ['match-result-reports', matchId] });
      queryClient.invalidateQueries({ queryKey: ['match-dispute', matchId] });
    },
  });

  // ── Submit result report ──────────────────────────────────────────────────────
  const submitReport = useMutation({
    mutationFn: async (params: {
      gameNumber: number; riotMatchId: string; mapId?: string; mapName?: string;
      team1Score: number; team2Score: number; winnerTeamId: string;
      reportedByTeamId: string; matchData?: any;
    }) => {
      if (!matchId || !user) throw new Error('Missing required data');
      return apiClient.post<MatchResultReport>(`/api/matches/${matchId}/reports`, {
        gameNumber:       params.gameNumber,
        riotMatchId:      params.riotMatchId,
        reportedByTeamId: params.reportedByTeamId,
        team1Score:       params.team1Score,
        team2Score:       params.team2Score,
        winnerTeamId:     params.winnerTeamId,
        mapId:            params.mapId ?? null,
        mapName:          params.mapName ?? null,
        matchData:        params.matchData ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-result-reports', matchId] });
      toast({ title: 'Result Reported', description: 'Waiting for opponent to verify.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to Report', description: err.message, variant: 'destructive' });
    },
  });

  // ── Accept report ─────────────────────────────────────────────────────────────
  const acceptReport = useMutation({
    mutationFn: async (params: { reportId: string; gameNumber: number; riotMatchId: string; mapId?: string }) => {
      if (!matchId || !user) throw new Error('Missing required data');
      return apiClient.post(`/api/matches/${matchId}/reports/${params.reportId}/accept`, {
        riotMatchId: params.riotMatchId,
        gameNumber:  params.gameNumber,
        mapId:       params.mapId ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-result-reports', matchId] });
      queryClient.invalidateQueries({ queryKey: ['bracket'] });
      queryClient.invalidateQueries({ queryKey: ['captain-all-matches'] });
      queryClient.invalidateQueries({ queryKey: ['captain-bracket-versions'] });
      queryClient.invalidateQueries({ queryKey: ['match-history-games'] });
      toast({ title: 'Result Verified!', description: 'Match scores have been recorded.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Verification Failed', description: err.message, variant: 'destructive' });
    },
  });

  // ── Evidence upload via backend storage proxy ────────────────────────────────
  const uploadDisputeEvidence = async (file: File): Promise<string> => {
    if (!matchId || !user?.id) throw new Error('Missing match or user context for evidence upload');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('bucket', 'tournaments.disputes.evidence');
    fd.append('folder', `matches/${matchId}/dispute-evidence/${user.id}`);
    const { url } = await apiClient.upload<{ url: string; path: string }>('/api/storage/upload', fd);
    return url;
  };

  // ── Dispute report ────────────────────────────────────────────────────────────
  const disputeReport = useMutation({
    mutationFn: async (params: { reportId: string; reason: string; teamId: string; evidenceFile?: File | null }) => {
      if (!matchId || !user) throw new Error('Missing required data');

      let evidenceUrls: string[] = [];

      // Upload evidence to Supabase Storage (Storage stays with Supabase)
      if (params.evidenceFile) {
        const url = await uploadDisputeEvidence(params.evidenceFile);
        evidenceUrls = [url];
      }

      return apiClient.post(`/api/matches/${matchId}/reports/${params.reportId}/dispute`, {
        reason:       params.reason,
        teamId:       params.teamId,
        evidenceUrls,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-result-reports', matchId] });
      queryClient.invalidateQueries({ queryKey: ['match-dispute', matchId] });
      toast({ title: 'Result Disputed', description: 'The organizer has been notified and will review.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to Dispute', description: err.message, variant: 'destructive' });
    },
  });

  return { reports, activeReport, acceptedReport, isMyReport, isLoading, submitReport, acceptReport, disputeReport };
};
