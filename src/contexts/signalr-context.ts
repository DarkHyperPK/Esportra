import { createContext } from 'react';
import type { HubConnection } from '@microsoft/signalr';

export interface SignalRContextValue {
  getConnection: (hubPath: string, options?: { autoStart?: boolean }) => HubConnection;
  /** Start (or await) a hub connection using the shared provider lock. */
  ensureHubStarted: (hubPath: string) => Promise<void>;
}

export const SignalRContext = createContext<SignalRContextValue | null>(null);
