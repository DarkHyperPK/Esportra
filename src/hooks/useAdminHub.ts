import { useEffect, useCallback, useState } from 'react';
import { HubConnectionState } from '@microsoft/signalr';
import { useHub, useSignalR } from './useSignalR';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface AdminPendingCounts {
  verifications: number;
  disputes: number;
  ghostApprovals: number;
  alerts: number;
}

export function useAdminHub() {
  const conn = useHub('/hubs/admin');
  const { ensureHubStarted: ensureConnected } = useSignalR();
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [pendingCounts, setPendingCounts] = useState<AdminPendingCounts | null>(null);

  useEffect(() => {
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = async () => {
      if (!active) return;

      try {
        await ensureConnected('/hubs/admin');
        if (!active) return;
        setConnected(true);
      } catch {
        if (active) {
          retryTimer = setTimeout(connect, 2000);
        }
      }
    };

    void connect();

    const handlePendingCountsUpdated = (counts: AdminPendingCounts) => {
      if (!active) return;
      setPendingCounts(counts);
      queryClient.invalidateQueries({ queryKey: ['admin', 'command-centre'] });
    };

    const handleNewVerificationRequest = (data: { id: string; username: string; role: string }) => {
      if (!active) return;
      toast.info(`New verification request from ${data.username}`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'command-centre'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'verifications'] });
    };

    const handleNewDispute = (data: { id: string; title: string }) => {
      if (!active) return;
      toast.info(`New dispute: ${data.title}`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'command-centre'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
    };

    const handleNewGhostApproval = (data: { requester_name: string; target_name: string }) => {
      if (!active) return;
      toast.info(`Ghost mode request: ${data.requester_name} → ${data.target_name}`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'ghost-approvals'] });
    };

    const handleNewAlert = (data: { message: string; severity: string }) => {
      if (!active) return;
      if (data.severity === 'critical') {
        toast.error(`Alert: ${data.message}`);
      } else {
        toast.warning(`Alert: ${data.message}`);
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'command-centre'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'alerts'] });
    };

    conn.on('PendingCountsUpdated', handlePendingCountsUpdated);
    conn.on('NewVerificationRequest', handleNewVerificationRequest);
    conn.on('NewDispute', handleNewDispute);
    conn.on('NewGhostApproval', handleNewGhostApproval);
    conn.on('NewAlert', handleNewAlert);

    const monitorInterval = setInterval(() => {
      if (!active) return;
      setConnected(conn.state === HubConnectionState.Connected);
    }, 5000);

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
      clearInterval(monitorInterval);
      conn.off('PendingCountsUpdated', handlePendingCountsUpdated);
      conn.off('NewVerificationRequest', handleNewVerificationRequest);
      conn.off('NewDispute', handleNewDispute);
      conn.off('NewGhostApproval', handleNewGhostApproval);
      conn.off('NewAlert', handleNewAlert);
    };
  }, [conn, ensureConnected, queryClient]);

  const refreshCounts = useCallback(async () => {
    if (conn.state === HubConnectionState.Connected) {
      await conn.invoke('RefreshCounts');
    }
  }, [conn]);

  return {
    connected,
    pendingCounts,
    refreshCounts,
  };
}
