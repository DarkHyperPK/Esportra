import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { clearRecoverySession, hasRecoverySession, initializeRecoverySession, markRecoverySession } from '@/lib/authRecovery';
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

export function usePasswordRecovery() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<PasswordRecoveryState>({
    status: 'checking-session',
    message: null,
  });

  useEffect(() => {
    let isActive = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        markRecoverySession();
      }
    });

    const initialize = async () => {
      try {
        initializeRecoverySession();
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isActive) return;
        if (error) throw error;
        if (!session || !hasRecoverySession()) {
          setState((current) => ({
            ...current,
            status: 'invalid-link',
            message: INVALID_LINK_MESSAGE,
          }));
          return;
        }
        setState((current) => ({ ...current, status: 'ready', message: null }));
      } catch (error) {
        if (!isActive) return;
        setState((current) => ({
          ...current,
          status: 'error',
          message: getErrorMessage(error, 'Could not verify this recovery session.'),
        }));
      }
    };

    void initialize();
    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<boolean> => {
    if (state.status !== 'ready') return false;

    let hasUpdatedPassword = false;
    setState((current) => ({ ...current, status: 'updating-password', message: null }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !hasRecoverySession()) throw new Error(INVALID_LINK_MESSAGE);

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      hasUpdatedPassword = true;

      await apiClient.postWithToken('/api/auth/password-reset-completed', session.access_token);
      setState((current) => ({ ...current, status: 'completed', message: null }));
      return true;
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'ready',
        message: getErrorMessage(error, 'Could not update your password.'),
      }));
      return false;
    } finally {
      if (hasUpdatedPassword) {
        await supabase.auth.signOut({ scope: 'local' });
        clearRecoverySession();
        resetClientSessionForAuthChange(queryClient);
      }
    }
  }, [queryClient, state.status]);

  const cancelRecovery = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' });
    clearRecoverySession();
    resetClientSessionForAuthChange(queryClient);
  }, [queryClient]);

  return {
    ...state,
    updatePassword,
    cancelRecovery,
  };
}
