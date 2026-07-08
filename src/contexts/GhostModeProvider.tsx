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
      session_id: string;
      ghost_token: string;
      expires_at: string;
      target_user: { id: string; username: string };
    }>(`/api/admin/ghost/${input.targetUserId}`, { reason: input.reason });

    const sessionData: GhostModeSession = {
      token: result.ghost_token,
      sessionId: result.session_id,
      adminId: '',
      targetUserId: result.target_user.id,
      targetLabel: result.target_user.username,
      scopes: input.scopes ?? ['view'],
      expiresAt: result.expires_at,
    };
    writeGhostModeSession(sessionData);
    setSession(sessionData);
  }, []);

  const exit = useCallback(async () => {
    try {
      const currentSession = readGhostModeSession();
      if (currentSession) {
        await apiClient.post('/api/admin/ghost/end', { token: currentSession.token });
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
