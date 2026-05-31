import { createContext } from 'react';
import type { HubConnection } from '@microsoft/signalr';

export interface SignalRContextValue {
  getConnection: (hubPath: string, options?: { autoStart?: boolean }) => HubConnection;
}

export const SignalRContext = createContext<SignalRContextValue | null>(null);
