import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import { HubConnectionState } from '@microsoft/signalr';
import { useHub } from '@/contexts/SignalRContext';
import { HubPaths } from '@/lib/signalrClient';

interface GameServer {
  matchId: string;
  server: {
    id: string;
    provider: string;
    region: string;
    ip: string | null;
    rawIp: string | null;
    port: number | null;
    gotvPort: number | null;
    map: string | null;
    status: string;
    serverName: string | null;
    costPerHour: number | null;
    connectUrl: string | null;
    startedAt: string | null;
    createdAt: string;
  };
}

export const useMatchServer = (matchId: string | undefined) => {
  const queryClient = useQueryClient();
  const conn = useHub(HubPaths.Match);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['match-server', matchId],
    queryFn: () => apiClient.get<GameServer>(`/api/matches/${matchId}/server`),
    enabled: !!matchId,
    staleTime: 1000 * 30, // 30s
    retry: (count, err) => {
      // Don't retry 404s (server not provisioned yet) — but retry transient errors once
      if ((err as any)?.status === 404 || (err as any)?.message?.includes('404')) return false;
      return count < 1;
    },
    refetchInterval: (query) => {
      // Poll every 10s while no server found (waiting for auto-provision)
      if (query.state.error || !query.state.data) return 10_000;
      return false;
    },
  });

  // Determine if this is a "not found" (still provisioning) vs a real error
  const is404 = !!(error && ((error as any)?.status === 404 || (error as any)?.message?.includes('404')));
  const isRealError = !!error && !is404;

  // Listen for SignalR server events via the shared MatchHub connection
  useEffect(() => {
    if (!matchId || conn.state !== HubConnectionState.Connected) return;

    const onProvisioned = () => {
      queryClient.invalidateQueries({ queryKey: ['match-server', matchId] });
    };
    const onDeleted = () => {
      queryClient.invalidateQueries({ queryKey: ['match-server', matchId] });
    };

    conn.on('ServerProvisioned', onProvisioned);
    conn.on('ServerDeleted', onDeleted);

    return () => {
      conn.off('ServerProvisioned', onProvisioned);
      conn.off('ServerDeleted', onDeleted);
    };
  }, [conn, matchId, queryClient]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  return {
    server: data?.server ?? null,
    isLoading,
    is404,
    isRealError,
    error,
    refetch,
    copyToClipboard,
  };
};

export type { GameServer };
