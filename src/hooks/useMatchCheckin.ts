import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMatchRealtime } from '@/hooks/useMatchRealtime';

interface MatchCheckin {
  match_id: string;
  team_id: string;
  user_id: string;
  checked_in_at: string;
}

interface CheckinStatus {
  team1CheckedIn: boolean;
  team2CheckedIn: boolean;
  team1CheckinTime: string | null;
  team2CheckinTime: string | null;
  bothCheckedIn: boolean;
}

export const useMatchCheckin = (
  matchId: string | undefined,
  team1Id: string | undefined,
  team2Id: string | undefined,
) => {
  const queryClient = useQueryClient();
  const { toast }   = useToast();
  const { user }    = useAuth();

  const { data: checkins, isLoading } = useQuery<MatchCheckin[]>({
    queryKey: ['match-checkins', matchId],
    queryFn: () => apiClient.get<MatchCheckin[]>(`/api/matches/${matchId}/checkins`),
    enabled: !!matchId,
    staleTime: 10_000,
  });

  const checkinStatus: CheckinStatus = {
    team1CheckedIn:  checkins?.some((c) => c.team_id === team1Id) ?? false,
    team2CheckedIn:  checkins?.some((c) => c.team_id === team2Id) ?? false,
    team1CheckinTime: checkins?.find((c) => c.team_id === team1Id)?.checked_in_at ?? null,
    team2CheckinTime: checkins?.find((c) => c.team_id === team2Id)?.checked_in_at ?? null,
    bothCheckedIn: false,
  };
  checkinStatus.bothCheckedIn = checkinStatus.team1CheckedIn && checkinStatus.team2CheckedIn;

  // Live check-in updates via SignalR MatchHub
  useMatchRealtime({
    matchId,
    enabled: !!matchId,
    onCheckInUpdated: () =>
      queryClient.invalidateQueries({ queryKey: ['match-checkins', matchId] }),
  });

  const checkIn = useMutation({
    mutationFn: (teamId: string) => {
      if (!matchId || !user) throw new Error('Missing required data');
      return apiClient.post(`/api/matches/${matchId}/checkin`, { teamId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-checkins', matchId] });
      toast({ title: 'Checked In!', description: 'You are ready for the match.' });
    },
    onError: (err: Error) => {
      const msg = err.message;
      if (msg.includes('duplicate') || msg.includes('conflict')) {
        toast({ title: 'Already Checked In', description: 'Your team has already checked in.' });
      } else {
        toast({ title: 'Check-in Failed', description: msg, variant: 'destructive' });
      }
    },
  });

  // ── Scheduling helpers (pure client-side time calculations) ──────────────────

  const isCheckinWindowOpen = (scheduledTime: string | null, windowMinutes = 15): boolean => {
    if (!scheduledTime) return false;
    const scheduled   = new Date(scheduledTime);
    const now         = new Date();
    const windowStart = new Date(scheduled.getTime() - windowMinutes * 60_000);
    return now >= windowStart && now < scheduled;
  };

  const getTimeUntilCheckinOpens = (scheduledTime: string | null, windowMinutes = 15): number | null => {
    if (!scheduledTime) return null;
    const scheduled   = new Date(scheduledTime);
    const windowStart = new Date(scheduled.getTime() - windowMinutes * 60_000);
    const diff = windowStart.getTime() - Date.now();
    return diff > 0 ? diff : null;
  };

  const isCheckinWindowClosed = (scheduledTime: string | null): boolean => {
    if (!scheduledTime) return false;
    return Date.now() >= new Date(scheduledTime).getTime();
  };

  const getTimeUntilWindowCloses = (scheduledTime: string | null): number | null => {
    if (!scheduledTime) return null;
    const diff = new Date(scheduledTime).getTime() - Date.now();
    return diff > 0 ? diff : null;
  };

  return {
    checkins,
    checkinStatus,
    isLoading,
    checkIn,
    isCheckinWindowOpen,
    getTimeUntilCheckinOpens,
    isCheckinWindowClosed,
    getTimeUntilWindowCloses,
  };
};
