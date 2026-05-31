import { useContext } from 'react';
import type { HubConnection } from '@microsoft/signalr';
import { SignalRContext } from '@/contexts/signalr-context';

export function useSignalR() {
  const ctx = useContext(SignalRContext);
  if (!ctx) throw new Error('useSignalR must be used inside <SignalRProvider>');
  return ctx;
}

export function useHub(hubPath: string, options?: { autoStart?: boolean }): HubConnection {
  const { getConnection } = useSignalR();
  return getConnection(hubPath, options);
}
