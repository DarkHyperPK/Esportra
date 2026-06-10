import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useMatchRealtime } from '@/hooks/useMatchRealtime';
import { normalizeCompetitorId } from '@/utils/competitorId';

interface MatchCheckin {
  match_id?: string;
  matchId?: string;
  team_id?: string;
  teamId?: string;
  user_id?: string;
  userId?: string;
  checked_in_at?: string;
  checkedInAt?: string;
}

const readCheckinTeamId = (row: MatchCheckin) =>
  normalizeCompetitorId(row.team_id ?? row.teamId);

const readCheckinTime = (row: MatchCheckin) =>
  row.checked_in_at ?? row.checkedInAt ?? null;

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
  options?: { subscribeRealtime?: boolean },
) => {
  const subscribeRealtime = options?.subscribeRealtime !== false;
  const queryClient = useQueryClient();
  const { toast }   = useToast();
  const { user }    = useAuth();

  const { data: checkins, isLoading } = useQuery<MatchCheckin[]>({
    queryKey: ['match-checkins', matchId],
    queryFn: () => apiClient.get<MatchCheckin[]>(`/api/matches/${matchId}/checkins`),
    enabled: !!matchId,
    staleTime: 10_000,
  });

  const normalizedTeam1Id = normalizeCompetitorId(team1Id);
  const normalizedTeam2Id = normalizeCompetitorId(team2Id);

  const checkinStatus: CheckinStatus = {
    team1CheckedIn: checkins?.some((c) => readCheckinTeamId(c) === normalizedTeam1Id) ?? false,
    team2CheckedIn: checkins?.some((c) => readCheckinTeamId(c) === normalizedTeam2Id) ?? false,
    team1CheckinTime: checkins?.find((c) => readCheckinTeamId(c) === normalizedTeam1Id)
      ? readCheckinTime(checkins.find((c) => readCheckinTeamId(c) === normalizedTeam1Id)!)
      : null,
    team2CheckinTime: checkins?.find((c) => readCheckinTeamId(c) === normalizedTeam2Id)
      ? readCheckinTime(checkins.find((c) => readCheckinTeamId(c) === normalizedTeam2Id)!)
      : null,
    bothCheckedIn: false,
  };
  checkinStatus.bothCheckedIn = checkinStatus.team1CheckedIn && checkinStatus.team2CheckedIn;

  // Live check-in updates via SignalR MatchHub (skip when parent owns MatchHub subscription)
  useMatchRealtime({
    matchId,
    enabled: subscribeRealtime && !!matchId,
    onCheckInUpdated: () => {
      void queryClient.invalidateQueries({ queryKey: ['match-checkins', matchId] });
      void queryClient.invalidateQueries({ queryKey: ['match-room-state', matchId] });
    },
  });

  const checkIn = useMutation({
    mutationFn: (teamId: string) => {
      if (!matchId || !user) throw new Error('Missing required data');
      return apiClient.post(`/api/matches/${matchId}/checkin`, { teamId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-checkins', matchId] });
      queryClient.invalidateQueries({ queryKey: ['match-room-state', matchId] });
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
    // Grace period: allow check-in until windowMinutes after scheduled time
    const windowEnd   = new Date(scheduled.getTime() + windowMinutes * 60_000);
    return now >= windowStart && now < windowEnd;
  };

  const getTimeUntilCheckinOpens = (scheduledTime: string | null, windowMinutes = 15): number | null => {
    if (!scheduledTime) return null;
    const scheduled   = new Date(scheduledTime);
    const windowStart = new Date(scheduled.getTime() - windowMinutes * 60_000);
    const diff = windowStart.getTime() - Date.now();
    return diff > 0 ? diff : null;
  };

  const isCheckinWindowClosed = (scheduledTime: string | null, windowMinutes = 15): boolean => {
    if (!scheduledTime) return false;
    // Only closed after the grace period (windowMinutes after scheduled time)
    const scheduled = new Date(scheduledTime);
    const windowEnd = new Date(scheduled.getTime() + windowMinutes * 60_000);
    return Date.now() >= windowEnd.getTime();
  };

  const getTimeUntilWindowCloses = (scheduledTime: string | null, windowMinutes = 15): number | null => {
    if (!scheduledTime) return null;
    const scheduled = new Date(scheduledTime);
    // Countdown to end of grace period
    const windowEnd = new Date(scheduled.getTime() + windowMinutes * 60_000);
    const diff = windowEnd.getTime() - Date.now();
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
