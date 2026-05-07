/**
 * useSeasonRealtime — live season events via SignalR SeasonHub.
 *
 * Groups joined: season:{seasonId} (public), season:staff:{seasonId} (organizers/staff)
 * Events: SeasonStatusChanged, TeamAdvanced, AnnouncementPosted, QualificationUpdated,
 *         StandingsUpdated, StructureChanged
 *
 * Features:
 * - Exponential backoff for reconnection
 * - Event deduplication
 * - Graceful offline handling
 */

import { useEffect, useRef } from 'react';
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

// Event deduplication: track recent event IDs to prevent duplicate processing
const EVENT_DEDUP_WINDOW = 5000; // 5 seconds
const eventCache = new Map<string, number>();

function isDuplicateEvent(eventType: string, payload: SeasonRealtimePayload): boolean {
  const eventId = `${eventType}:${payload.seasonId}:${JSON.stringify(payload)}`;
  const now = Date.now();
  
  // Clean old entries
  for (const [key, timestamp] of eventCache.entries()) {
    if (now - timestamp > EVENT_DEDUP_WINDOW) {
      eventCache.delete(key);
    }
  }
  
  // Check if duplicate
  if (eventCache.has(eventId)) {
    return true;
  }
  
  eventCache.set(eventId, now);
  return false;
}

// Exponential backoff for reconnection
async function withExponentialBackoff(fn: () => Promise<void>, maxRetries = 5): Promise<void> {
  let retryCount = 0;
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  
  while (retryCount < maxRetries) {
    try {
      await fn();
      return;
    } catch (error) {
      retryCount++;
      if (retryCount >= maxRetries) {
        throw error;
      }
      
      const delay = Math.min(baseDelay * Math.pow(2, retryCount - 1), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
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
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    if (!enabled || !seasonId) return;

    let active = true;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['season-standings', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['season-qualifications', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['season-tournaments', seasonId] });
    };

    const wrap = (eventType: string, cb?: (p: SeasonRealtimePayload) => void) =>
      (payload: SeasonRealtimePayload) => {
        if (!active) return;
        
        // Deduplicate events
        if (isDuplicateEvent(eventType, payload)) {
          return;
        }
        
        invalidate();
        cb?.(payload);
      };

    const handleSeasonStatusChanged = wrap('SeasonStatusChanged', onSeasonStatusChanged);
    const handleTeamAdvanced = wrap('TeamAdvanced', onTeamAdvanced);
    const handleAnnouncementPosted = wrap('AnnouncementPosted', onAnnouncementPosted);
    const handleQualificationUpdated = wrap('QualificationUpdated', onQualificationUpdated);
    const handleStandingsUpdated = wrap('StandingsUpdated', onStandingsUpdated);
    const handleStructureChanged = wrap('StructureChanged', onStructureChanged);

    conn.on('SeasonStatusChanged', handleSeasonStatusChanged);
    conn.on('TeamAdvanced', handleTeamAdvanced);
    conn.on('AnnouncementPosted', handleAnnouncementPosted);
    conn.on('QualificationUpdated', handleQualificationUpdated);
    conn.on('StandingsUpdated', handleStandingsUpdated);
    conn.on('StructureChanged', handleStructureChanged);

    const join = async () => {
      if (!active || conn.state !== HubConnectionState.Connected) return;
      
      try {
        await withExponentialBackoff(() => conn.invoke('JoinSeason', seasonId));
        reconnectAttemptsRef.current = 0; // Reset on success
      } catch (error) {
        console.warn('Failed to join season group:', error);
        reconnectAttemptsRef.current++;
      }
    };

    join();

    // Handle reconnection with exponential backoff
    const handleReconnected = async () => {
      reconnectAttemptsRef.current = 0;
      await join();
    };

    const handleReconnecting = () => {
      console.log('SignalR reconnecting...');
    };

    const handleClose = () => {
      console.log('SignalR connection closed');
    };

    conn.onreconnected(handleReconnected);
    conn.onreconnecting(handleReconnecting);
    conn.onclose(handleClose);

    return () => {
      active = false;
      conn.off('SeasonStatusChanged', handleSeasonStatusChanged);
      conn.off('TeamAdvanced', handleTeamAdvanced);
      conn.off('AnnouncementPosted', handleAnnouncementPosted);
      conn.off('QualificationUpdated', handleQualificationUpdated);
      conn.off('StandingsUpdated', handleStandingsUpdated);
      conn.off('StructureChanged', handleStructureChanged);
      
      if (conn.state === HubConnectionState.Connected) {
        conn.invoke('LeaveSeason', seasonId).catch(() => {});
      }
    };
  }, [conn, seasonId, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}

export default useSeasonRealtime;
