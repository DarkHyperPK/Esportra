import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import {
  clearGhostModeSession,
  readGhostModeSession,
  writeGhostModeSession,
  type GhostModeSession,
} from '@/lib/ghostModeSession';
import { GhostModeContext, type GhostModeContextValue, type StartGhostModeInput } from '@/contexts/ghostModeContext';

export function GhostModeProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<GhostModeSession | null>(() => readGhostModeSession());

  const refresh = useCallback(() => {
    setSession(readGhostModeSession());
  }, []);

  useEffect(() => {
    window.addEventListener('ghost-mode-session-changed', refresh);
    window.addEventListener('storage', refresh);
    const interval = window.setInterval(refresh, 15_000);
    return () => {
      window.removeEventListener('ghost-mode-session-changed', refresh);
      window.removeEventListener('storage', refresh);
      window.clearInterval(interval);
    };
  }, [refresh]);

  const start = useCallback(async (input: StartGhostModeInput) => {
    const result = await apiClient.post<{
      token: string;
      sessionId: string;
      adminId: string;
      targetUserId: string;
      targetLabel: string;
      scopes: string[];
      expiresAt: string;
    }>('/api/admin/operations/impersonation/start', input);
    writeGhostModeSession(result);
    setSession(result);
  }, []);

  const exit = useCallback(async () => {
    try {
      if (readGhostModeSession()) {
        await apiClient.post('/api/operations/impersonation/end', {});
      }
    } finally {
      clearGhostModeSession();
      setSession(null);
    }
  }, []);

  const value = useMemo<GhostModeContextValue>(() => ({
    session,
    isActive: !!session,
    start,
    exit,
  }), [session, start, exit]);

  return (
    <GhostModeContext.Provider value={value}>
      {children}
    </GhostModeContext.Provider>
  );
}
