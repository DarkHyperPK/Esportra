import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { supabase } from '@/lib/supabase';
import {
  clearGhostModeSession,
  readGhostModeSession,
  writeGhostModeSession,
  type GhostModeSession,
} from '@/lib/ghostModeSession';
import { GhostModeContext, type GhostModeContextValue, type StartGhostModeInput } from '@/contexts/ghostModeContext';

export function GhostModeProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<GhostModeSession | null>(() => readGhostModeSession());
  const queryClient = useQueryClient();

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
    // Capture admin token BEFORE making ghost request (needed for exit)
    const { data: { session: supabaseSession } } = await supabase.auth.getSession();
    const adminToken = supabaseSession?.access_token ?? '';

    const result = await apiClient.post<{
      session_id: string;
      ghost_token: string;
      expires_at: string;
      target_user: { id: string; username: string };
    }>(`/api/admin/ghost/${input.targetUserId}`, { reason: input.reason });

    const sessionData: GhostModeSession = {
      token: result.ghost_token,
      adminToken,
      sessionId: result.session_id,
      adminId: supabaseSession?.user?.id ?? '',
      targetUserId: result.target_user.id,
      targetLabel: result.target_user.username,
      scopes: input.scopes ?? ['view'],
      expiresAt: result.expires_at,
    };
    writeGhostModeSession(sessionData);
    setSession(sessionData);

    // Invalidate profile queries so they refetch with the ghost token
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
  }, [queryClient]);

  const exit = useCallback(async () => {
    try {
      const currentSession = readGhostModeSession();
      if (currentSession?.adminToken) {
        // Use admin token for exit (ghost token is target user, not admin)
        await apiClient.postWithToken('/api/admin/ghost/end', currentSession.adminToken, {
          token: currentSession.token,
        });
      }
    } finally {
      clearGhostModeSession();
      setSession(null);
      // Invalidate profile queries so they refetch with the admin's token
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  }, [queryClient]);

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
