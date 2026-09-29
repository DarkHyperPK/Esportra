/**
 * Live tournament stage updates via SignalR BracketHub.
 * Joins tournament:{tournamentId} with ref-counting so multiple subscribers
 * on the same page do not drop the group prematurely.
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HubConnectionState, type HubConnection } from '@microsoft/signalr';
import { useHub } from '@/hooks/useSignalR';
import { HubPaths } from '@/lib/signalrClient';
import { stageSchedulingConfigQueryKey } from '@/hooks/useMatchScheduling';

type TournamentStatusChangedPayload = {
  tournamentId?: string;
  status?: string;
};

export type StageUpdatedPayload = {
  stageId?: string;
  tournamentId?: string;
  field?: string;
  schedulingConfig?: Record<string, unknown>;
};

type Options = {
  tournamentId: string | undefined;
  enabled?: boolean;
  onStageUpdated?: (payload: StageUpdatedPayload) => void;
  onVersionCreated?: (payload: { versionId?: string; tournamentId?: string }) => void;
  /** When provided, invalidates the tournament-dashboard query on TournamentStatusChanged. */
  dashboardSlug?: string;
  dashboardUserId?: string;
};

const tournamentJoinCounts = new Map<string, number>();

const acquireTournamentJoin = (tournamentId: string): boolean => {
  const next = (tournamentJoinCounts.get(tournamentId) ?? 0) + 1;
  tournamentJoinCounts.set(tournamentId, next);
  return next === 1;
};

const releaseTournamentJoin = (tournamentId: string): boolean => {
  const current = tournamentJoinCounts.get(tournamentId) ?? 0;
  if (current <= 1) {
    tournamentJoinCounts.delete(tournamentId);
    return true;
  }
  tournamentJoinCounts.set(tournamentId, current - 1);
  return false;
};

const joinTournamentGroup = async (conn: HubConnection, tournamentId: string) => {
  if (conn.state !== HubConnectionState.Connected) return;
  if (!acquireTournamentJoin(tournamentId)) return;
  try {
    await conn.invoke('JoinTournament', tournamentId);
  } catch (error) {
    releaseTournamentJoin(tournamentId);
    console.warn('[useStageRealtime] JoinTournament failed', error);
  }
};

const leaveTournamentGroup = async (conn: HubConnection, tournamentId: string) => {
  if (!releaseTournamentJoin(tournamentId)) return;
  if (conn.state !== HubConnectionState.Connected) return;
  try {
    await conn.invoke('LeaveTournament', tournamentId);
  } catch {
    // Group may already be gone on disconnect.
  }
};

export function useStageRealtime({
  tournamentId,
  enabled = true,
  onStageUpdated,
  onVersionCreated,
  dashboardSlug,
  dashboardUserId,
}: Options) {
  const conn = useHub(HubPaths.Bracket);
  const notifConn = useHub(HubPaths.Notification);
  const queryClient = useQueryClient();
  const isEnabled = enabled && !!tournamentId;

  useEffect(() => {
    if (!isEnabled || !tournamentId) return;

    let active = true;

    const handleStageUpdated = (payload: StageUpdatedPayload) => {
      if (!active) return;

      const stageId = payload?.stageId ? String(payload.stageId) : undefined;
      const tid = payload?.tournamentId ? String(payload.tournamentId) : tournamentId;

      if (stageId && payload.field === 'scheduling_config' && payload.schedulingConfig) {
        queryClient.setQueryData(
          stageSchedulingConfigQueryKey(stageId),
          payload.schedulingConfig,
        );
      } else if (stageId) {
        queryClient.invalidateQueries({ queryKey: stageSchedulingConfigQueryKey(stageId) });
      }

      queryClient.invalidateQueries({ queryKey: ['tournament-stages', tid] });
      onStageUpdated?.(payload);
    };

    const handleVersionCreated = (payload: { versionId?: string; tournamentId?: string }) => {
      if (!active) return;
      queryClient.invalidateQueries({ queryKey: ['bracket-versions'] });
      queryClient.invalidateQueries({ queryKey: ['tournament-stages', tournamentId] });
      if (payload?.versionId) {
        queryClient.invalidateQueries({ queryKey: ['bracket-graph', payload.versionId] });
      }
      onVersionCreated?.(payload);
    };

    conn.on('StageUpdated', handleStageUpdated);
    conn.on('VersionCreated', handleVersionCreated);

    const join = () => {
      if (!active) return;
      void joinTournamentGroup(conn, tournamentId);
    };

    join();
    conn.onreconnected(join);

    return () => {
      active = false;
      conn.off('StageUpdated', handleStageUpdated);
      conn.off('VersionCreated', handleVersionCreated);
      void leaveTournamentGroup(conn, tournamentId);
    };
  }, [conn, isEnabled, onStageUpdated, onVersionCreated, queryClient, tournamentId]);

  // Invalidate the tournament dashboard when the tournament status changes (e.g. → ongoing).
  // The NotificationHub is already connected at app level via NotificationProvider.
  useEffect(() => {
    if (!tournamentId || !dashboardSlug || !dashboardUserId) return;

    const handleTournamentStatusChanged = (payload: TournamentStatusChangedPayload) => {
      if (String(payload?.tournamentId) !== tournamentId) return;
      queryClient.invalidateQueries({ queryKey: ['tournament-dashboard', dashboardSlug, dashboardUserId] });
    };

    notifConn.on('TournamentStatusChanged', handleTournamentStatusChanged);
    return () => {
      notifConn.off('TournamentStatusChanged', handleTournamentStatusChanged);
    };
  }, [notifConn, tournamentId, dashboardSlug, dashboardUserId, queryClient]);
}

export default useStageRealtime;
