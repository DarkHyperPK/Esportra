/**
 * useSeasonRealtime — live season events via SignalR SeasonHub.
 *
 * Groups joined: season:{seasonId} (public), season:staff:{seasonId} (organizers/staff)
 * Events: SeasonStatusChanged, TeamAdvanced, AnnouncementPosted, QualificationUpdated,
 *         StandingsUpdated, StructureChanged
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HubConnectionState } from '@microsoft/signalr';
import { useHub } from '@/contexts/SignalRContext';
import { HubPaths } from '@/lib/signalrClient';

interface SeasonRealtimePayload {
  seasonId: string;
  status?: string;
  [key: string]: unknown;
}

interface Options {
  seasonId: string | null | undefined;
  enabled?: boolean;
  onSeasonStatusChanged?: (payload: SeasonRealtimePayload) => void;
  onTeamAdvanced?: (payload: SeasonRealtimePayload) => void;
  onAnnouncementPosted?: (payload: SeasonRealtimePayload) => void;
  onQualificationUpdated?: (payload: SeasonRealtimePayload) => void;
  onStandingsUpdated?: (payload: SeasonRealtimePayload) => void;
  onStructureChanged?: (payload: SeasonRealtimePayload) => void;
}

export function useSeasonRealtime({
  seasonId,
  enabled = true,
  onSeasonStatusChanged,
  onTeamAdvanced,
  onAnnouncementPosted,
  onQualificationUpdated,
  onStandingsUpdated,
  onStructureChanged,
}: Options) {
  const conn = useHub(HubPaths.Season);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !seasonId) return;

    let active = true;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['season-standings', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['season-qualifications', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['season-tournaments', seasonId] });
    };

    const wrap = (cb?: (p: SeasonRealtimePayload) => void) =>
      (payload: SeasonRealtimePayload) => {
        if (!active) return;
        invalidate();
        cb?.(payload);
      };

    const handleSeasonStatusChanged = wrap(onSeasonStatusChanged);
    const handleTeamAdvanced = wrap(onTeamAdvanced);
    const handleAnnouncementPosted = wrap(onAnnouncementPosted);
    const handleQualificationUpdated = wrap(onQualificationUpdated);
    const handleStandingsUpdated = wrap(onStandingsUpdated);
    const handleStructureChanged = wrap(onStructureChanged);

    conn.on('SeasonStatusChanged', handleSeasonStatusChanged);
    conn.on('TeamAdvanced', handleTeamAdvanced);
    conn.on('AnnouncementPosted', handleAnnouncementPosted);
    conn.on('QualificationUpdated', handleQualificationUpdated);
    conn.on('StandingsUpdated', handleStandingsUpdated);
    conn.on('StructureChanged', handleStructureChanged);

    const join = () => {
      if (!active || conn.state !== HubConnectionState.Connected) return;
      conn.invoke('JoinSeason', seasonId).catch(console.warn);
    };
    join();
    conn.onreconnected(join);

    return () => {
      active = false;
      conn.off('SeasonStatusChanged', handleSeasonStatusChanged);
      conn.off('TeamAdvanced', handleTeamAdvanced);
      conn.off('AnnouncementPosted', handleAnnouncementPosted);
      conn.off('QualificationUpdated', handleQualificationUpdated);
      conn.off('StandingsUpdated', handleStandingsUpdated);
      conn.off('StructureChanged', handleStructureChanged);
      if (conn.state === HubConnectionState.Connected)
        conn.invoke('LeaveSeason', seasonId).catch(() => {});
    };
  }, [conn, seasonId, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}

export default useSeasonRealtime;
