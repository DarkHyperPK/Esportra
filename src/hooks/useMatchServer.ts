import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import { HubConnectionState } from '@microsoft/signalr';
import type { HubConnection } from '@microsoft/signalr';

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

export const useMatchServer = (matchId: string | undefined, matchHubConnection?: HubConnection | null) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['match-server', matchId],
    queryFn: () => apiClient.get<GameServer>(`/api/matches/${matchId}/server`),
    enabled: !!matchId,
    staleTime: 1000 * 30, // 30s
    retry: false,
  });

  // Listen for SignalR server events
  useEffect(() => {
    if (!matchHubConnection || matchHubConnection.state !== HubConnectionState.Connected) return;

    const onProvisioned = () => {
      queryClient.invalidateQueries({ queryKey: ['match-server', matchId] });
    };
    const onDeleted = () => {
      queryClient.invalidateQueries({ queryKey: ['match-server', matchId] });
    };

    matchHubConnection.on('ServerProvisioned', onProvisioned);
    matchHubConnection.on('ServerDeleted', onDeleted);

    return () => {
      matchHubConnection.off('ServerProvisioned', onProvisioned);
      matchHubConnection.off('ServerDeleted', onDeleted);
    };
  }, [matchHubConnection, matchId, queryClient]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  return {
    server: data?.server ?? null,
    isLoading,
    error,
    refetch,
    copyToClipboard,
  };
};

export type { GameServer };
