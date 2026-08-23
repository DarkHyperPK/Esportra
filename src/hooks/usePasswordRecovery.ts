import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { resetClientSessionForAuthChange } from '@/lib/resetClientSession';

type RecoveryStatus =
  | 'checking-session'
  | 'ready'
  | 'updating-password'
  | 'completed'
  | 'invalid-link'
  | 'error';

interface PasswordRecoveryState {
  status: RecoveryStatus;
  message: string | null;
}

const INVALID_LINK_MESSAGE = 'Your reset session has expired or is invalid. Please request a new link.';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function getTokenFromUrl(): { tokenHash: string; type: string } | null {
  const search = new URLSearchParams(window.location.search);
  const tokenHash = search.get('token_hash');
  const type = search.get('type');
  if (!tokenHash || type !== 'recovery') return null;
  return { tokenHash, type };
}

export function usePasswordRecovery() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<PasswordRecoveryState>({
    status: 'checking-session',
    message: null,
  });
  const [token, setToken] = useState<{ tokenHash: string; type: string } | null>(null);

  useEffect(() => {
    const parsed = getTokenFromUrl();
    if (!parsed) {
      setState({ status: 'invalid-link', message: INVALID_LINK_MESSAGE });
      return;
    }
    setToken(parsed);
    setState({ status: 'ready', message: null });
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<boolean> => {
    if (state.status !== 'ready' || !token) return false;

    setState((current) => ({ ...current, status: 'updating-password', message: null }));
    try {
      await apiClient.post('/api/auth/set-password', {
        password,
        tokenHash: token.tokenHash,
        type: token.type,
      });
      setState({ status: 'completed', message: null });
      resetClientSessionForAuthChange(queryClient);
      return true;
    } catch (error) {
      const message = getErrorMessage(error, 'Could not update your password.');
      const isExpired = message.toLowerCase().includes('expired') || message.toLowerCase().includes('invalid');
      setState({
        status: isExpired ? 'invalid-link' : 'ready',
        message: isExpired ? INVALID_LINK_MESSAGE : message,
      });
      return false;
    }
  }, [queryClient, state.status, token]);

  const cancelRecovery = useCallback(async () => {
    resetClientSessionForAuthChange(queryClient);
  }, [queryClient]);

  return {
    ...state,
    updatePassword,
    cancelRecovery,
  };
}
