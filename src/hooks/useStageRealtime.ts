/**
 * useStageRealtime — tournament stage + bracket version events via SignalR.
 * Replaces Supabase postgres_changes on tournament_stages + brkt_versions.
 *
 * Groups joined: tournament:{tournamentId}
 * Events: StageUpdated, VersionCreated
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HubConnectionState } from '@microsoft/signalr';
import { useHub } from '@/contexts/SignalRContext';
import { HubPaths } from '@/lib/signalrClient';

interface Options {
  tournamentId: string | null | undefined;
  enabled?: boolean;
  onStageStatusChange?: (stageId: string, newStatus: string) => void;
}

export function useStageRealtime({ tournamentId, enabled = true, onStageStatusChange }: Options) {
  const conn        = useHub(HubPaths.Bracket);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !tournamentId) return;

    let active = true;

    const handleStageUpdated = (payload: { stageId: string; status: string; [k: string]: unknown }) => {
      if (!active) return;
      queryClient.setQueriesData<{ stages?: Array<{ id: string }> }>(
        { queryKey: ['tournament', tournamentId] },
        (old) => !old?.stages ? old : {
          ...old,
          stages: old.stages.map((s) => s.id === payload.stageId ? { ...s, ...payload } : s),
        },
      );
      queryClient.invalidateQueries({ queryKey: ['stage', payload.stageId] });
      onStageStatusChange?.(payload.stageId, payload.status);
    };

    const handleVersionCreated = (payload: { versionId: string }) => {
      if (!active) return;
      queryClient.invalidateQueries({ queryKey: ['bracket-versions', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['bracket', payload.versionId] });
    };

    conn.on('StageUpdated', handleStageUpdated);
    conn.on('VersionCreated', handleVersionCreated);

    const join = () => {
      if (!active || conn.state !== HubConnectionState.Connected) return;
      conn.invoke('JoinTournament', tournamentId).catch(console.warn);
    };
    join();
    conn.onreconnected(join);

    return () => {
      active = false;
      conn.off('StageUpdated', handleStageUpdated);
      conn.off('VersionCreated', handleVersionCreated);
      if (conn.state === HubConnectionState.Connected)
        conn.invoke('LeaveTournament', tournamentId).catch(() => {});
    };
  }, [conn, tournamentId, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}

export default useStageRealtime;
