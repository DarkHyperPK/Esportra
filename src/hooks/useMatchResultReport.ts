import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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
  status: 'pending' | 'accepted' | 'disputed';
  responded_by: string | null;
  responded_at: string | null;
  dispute_reason: string | null;
  created_at: string;
}

export const useMatchResultReport = (matchId: string | undefined, gameNumber?: number) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch all reports for this match
  const { data: reports, isLoading } = useQuery({
    queryKey: ['match-result-reports', matchId],
    queryFn: async () => {
      if (!matchId) return [];
      const { data, error } = await supabase
        .from('match_result_reports')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MatchResultReport[];
    },
    enabled: !!matchId,
  });

  // Get the latest pending report (filtered by gameNumber if provided)
  const activeReport = reports?.find(r =>
    r.status === 'pending' &&
    (!gameNumber || r.game_number === gameNumber)
  ) ?? null;

  // Get the latest accepted report (filtered by gameNumber if provided)
  const acceptedReport = reports?.find(r =>
    r.status === 'accepted' &&
    (!gameNumber || r.game_number === gameNumber)
  ) ?? null;

  // Check if user is the reporter
  const isMyReport = activeReport?.reported_by === user?.id;

  // Submit a result report (captain selects a Riot match)
  const submitReport = useMutation({
    mutationFn: async ({
      gameNumber,
      riotMatchId,
      mapId,
      mapName,
      team1Score,
      team2Score,
      winnerTeamId,
      reportedByTeamId,
      matchData,
    }: {
      gameNumber: number;
      riotMatchId: string;
      mapId?: string;
      mapName?: string;
      team1Score: number;
      team2Score: number;
      winnerTeamId: string;
      reportedByTeamId: string;
      matchData?: any;
    }) => {
      if (!matchId || !user) throw new Error('Missing required data');

      const { data, error } = await supabase
        .from('match_result_reports')
        .insert({
          match_id: matchId,
          game_number: gameNumber,
          reported_by: user.id || null,
          reported_by_team_id: reportedByTeamId || null,
          riot_match_id: riotMatchId,
          map_id: mapId || null,
          map_name: mapName || null,
          team1_score: team1Score,
          team2_score: team2Score,
          winner_team_id: winnerTeamId || null,
          match_data: matchData || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Notify opposing captain that a result has been reported
      const { data: brktMatch } = await supabase
        .from('brkt_matches')
        .select('team1_id, team2_id')
        .eq('id', matchId)
        .maybeSingle();

      if (brktMatch) {
        const opposingTeamId = brktMatch.team1_id === reportedByTeamId
          ? brktMatch.team2_id
          : brktMatch.team1_id;
        if (opposingTeamId) {
          const { data: captainRow } = await supabase
            .from('team_members')
            .select('user_id')
            .eq('team_id', opposingTeamId)
            .eq('role', 'captain')
            .eq('is_active', true)
            .maybeSingle();
          if (captainRow?.user_id) {
            await supabase.from('notifications').insert({
              user_id: captainRow.user_id,
              type: 'result_reported',
              title: 'Match Result Reported',
              message: 'Your opponent has reported the match result. Please verify or dispute.',
              link: '/tournaments/captain',
              data: { match_id: matchId },
              is_read: false,
            });
          }
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-result-reports', matchId] });
      toast({ title: 'Result Reported', description: 'Waiting for opponent to verify.' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to Report', description: error.message, variant: 'destructive' });
    },
  });

  // Accept a result report (opposing captain)
  const acceptReport = useMutation({
    mutationFn: async ({
      reportId,
      gameNumber,
      riotMatchId,
      mapId,
    }: {
      reportId: string;
      gameNumber: number;
      riotMatchId: string;
      mapId?: string;
    }) => {
      if (!matchId || !user) throw new Error('Missing required data');

      // Mark report as accepted is now handled by the Edge Function for atomicity and RLS bypass.
      // We just call the function.


      // 2. Call process-match-result to finalize scores in brkt_match_games
      const { data, error: invokeError } = await supabase.functions.invoke('process-match-result', {
        body: {
          matchId,
          gameNumber,
          riotMatchId,
          mapId,
        },
      });

      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-result-reports', matchId] });
      queryClient.invalidateQueries({ queryKey: ['bracket'] });
      queryClient.invalidateQueries({ queryKey: ['captain-all-matches'] });
      queryClient.invalidateQueries({ queryKey: ['captain-bracket-versions'] });
      queryClient.invalidateQueries({ queryKey: ['match-history-games'] });
      toast({ title: 'Result Verified!', description: 'Match scores have been recorded.' });
    },
    onError: (error: any) => {
      toast({ title: 'Verification Failed', description: error.message, variant: 'destructive' });
    },
  });

  // Dispute a result report (opposing captain)
  const disputeReport = useMutation({
    mutationFn: async ({
      reportId,
      reason,
      teamId,
    }: {
      reportId: string;
      reason: string;
      teamId: string;
    }) => {
      if (!matchId || !user) throw new Error('Missing required data');

      // Atomic RPC: marks report disputed, writes to match_disputes + tournament_disputes,
      // and sends notifications to the reporter and organizer.
      const { error } = await supabase.rpc('file_match_result_dispute', {
        p_report_id: reportId,
        p_match_id: matchId,
        p_team_id: teamId,
        p_reason: reason,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-result-reports', matchId] });
      queryClient.invalidateQueries({ queryKey: ['match-dispute', matchId] });
      toast({
        title: 'Result Disputed',
        description: 'The organizer has been notified and will review.',
      });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to Dispute', description: error.message, variant: 'destructive' });
    },
  });

  // Real-time subscription for live updates
  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`match-result-reports-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_result_reports',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['match-result-reports', matchId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, queryClient]);

  return {
    reports,
    activeReport,
    acceptedReport,
    isMyReport,
    isLoading,
    submitReport,
    acceptReport,
    disputeReport,
  };
};
