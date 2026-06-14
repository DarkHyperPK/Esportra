import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useMatchRealtime } from '@/hooks/useMatchRealtime';
import { invalidateMatchLifecycleQueries } from '@/utils/matchLifecycleQueries';
import { normalizeScheduledTime } from '@/utils/scheduledTime';

export type MatchRoomPhase =
  | 'needs_schedule'
  | 'awaiting_checkin'
  | 'awaiting_party_code'
  | 'awaiting_veto'
  | 'ready_for_match'
  | 'completed';

export type MatchRoomNextAction =
  | 'none'
  | 'propose_time'
  | 'check_in'
  | 'submit_party_code'
  | 'complete_veto'
  | 'report_result';

export interface MatchRoomState {
  selfPlayEnabled: boolean;
  phase: MatchRoomPhase | null;
  nextAction: MatchRoomNextAction | null;
  message: string | null;
  effectiveScheduledTime: string | null;
  scheduleSource: string | null;
  checkinWindowMinutes: number;
  checkinWindowOpen: boolean;
  checkinWindowClosed: boolean;
  bothCheckedIn: boolean;
  team1CheckedIn: boolean;
  team2CheckedIn: boolean;
  team1Id: string | null;
  team2Id: string | null;
  callerCompetitorId: string | null;
  callerIsTeam1Captain: boolean;
  callerCanForceGoLive: boolean;
  isMatchLive: boolean;
  partyCode: string | null;
  mapVetoEnabled: boolean;
  mapVetoCompleted: boolean;
}

const normalizePhase = (value: unknown): MatchRoomPhase | null => {
  if (typeof value !== 'string' || !value) return null;
  const allowed: MatchRoomPhase[] = [
    'needs_schedule',
    'awaiting_checkin',
    'awaiting_party_code',
    'awaiting_veto',
    'ready_for_match',
    'completed',
  ];
  return allowed.includes(value as MatchRoomPhase) ? (value as MatchRoomPhase) : null;
};

const normalizeNextAction = (value: unknown): MatchRoomNextAction | null => {
  if (typeof value !== 'string' || !value) return null;
  const allowed: MatchRoomNextAction[] = [
    'none',
    'propose_time',
    'check_in',
    'submit_party_code',
    'complete_veto',
    'report_result',
  ];
  return allowed.includes(value as MatchRoomNextAction) ? (value as MatchRoomNextAction) : null;
};

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

export const matchRoomStateQueryKey = (matchId: string | undefined) =>
  ['match-room-state', matchId] as const;

export const useMatchRoomState = (
  matchId: string | undefined,
  options?: { subscribeRealtime?: boolean; enabled?: boolean; versionId?: string | null },
) => {
  const subscribeRealtime = options?.subscribeRealtime !== false;
  const enabled = options?.enabled !== false && !!matchId;
  const versionId = options?.versionId ?? null;
  const queryClient = useQueryClient();
  const previousPhaseRef = useRef<MatchRoomPhase | null>(null);

  const invalidate = () => {
    if (!matchId) return;
    queryClient.invalidateQueries({ queryKey: matchRoomStateQueryKey(matchId) });
  };

  const query = useQuery<MatchRoomState>({
    queryKey: matchRoomStateQueryKey(matchId),
    queryFn: async () => {
      const data = await apiClient.get<Record<string, unknown>>(`/api/matches/${matchId}/room-state`);
      return {
        selfPlayEnabled: Boolean(data.selfPlayEnabled),
        phase: normalizePhase(data.phase),
        nextAction: normalizeNextAction(data.nextAction),
        message: readString(data.message),
        effectiveScheduledTime: normalizeScheduledTime(data.effectiveScheduledTime),
        scheduleSource: readString(data.scheduleSource),
        checkinWindowMinutes: typeof data.checkinWindowMinutes === 'number' ? data.checkinWindowMinutes : 15,
        checkinWindowOpen: Boolean(data.checkinWindowOpen),
        checkinWindowClosed: Boolean(data.checkinWindowClosed),
        bothCheckedIn: Boolean(data.bothCheckedIn),
        team1CheckedIn: Boolean(data.team1CheckedIn),
        team2CheckedIn: Boolean(data.team2CheckedIn),
        team1Id: readString(data.team1Id),
        team2Id: readString(data.team2Id),
        callerCompetitorId: readString(data.callerCompetitorId),
        callerIsTeam1Captain: Boolean(data.callerIsTeam1Captain),
        callerCanForceGoLive: Boolean(data.callerCanForceGoLive),
        isMatchLive: Boolean(data.isMatchLive),
        partyCode: readString(data.partyCode),
        mapVetoEnabled: Boolean(data.mapVetoEnabled),
        mapVetoCompleted: Boolean(data.mapVetoCompleted),
      };
    },
    enabled,
    staleTime: 5_000,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.phase === 'completed') return false;
      // Poll while check-in window is closed so walkover completion is picked up quickly
      if (data?.checkinWindowClosed && !data?.bothCheckedIn) {
        return 15_000;
      }
      // Poll while waiting for party code or until go-live propagates
      if (data?.phase === 'awaiting_party_code' || (data?.bothCheckedIn && !data?.isMatchLive)) {
        return 10_000;
      }
      if (data?.bothCheckedIn) return false;
      if (data?.phase === 'awaiting_checkin' || data?.nextAction === 'check_in') {
        return 30_000;
      }
      // Catch room-state lag after a captain accepts a time proposal
      if (data?.selfPlayEnabled && data?.phase === 'needs_schedule') {
        return 15_000;
      }
      return false;
    },
    retry: (failureCount, error) => {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('404')) return false;
      return failureCount < 2;
    },
  });

  useMatchRealtime({
    matchId,
    enabled: subscribeRealtime && enabled,
    onStatusChanged: invalidate,
    onCheckInUpdated: invalidate,
    onTimeProposalUpdated: invalidate,
    onScheduleChanged: invalidate,
    onReportSubmitted: invalidate,
    onReportAccepted: invalidate,
    onReportDisputed: invalidate,
    onDisputeResolved: invalidate,
  });

  useEffect(() => {
    const phase = query.data?.phase ?? null;
    if (phase === 'completed' && previousPhaseRef.current !== 'completed') {
      invalidateMatchLifecycleQueries(queryClient, { matchId, versionId });
    }
    previousPhaseRef.current = phase;
  }, [query.data?.phase, matchId, versionId, queryClient]);

  return {
    ...query,
    roomState: query.data,
    invalidateRoomState: invalidate,
  };
};
