import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { clearRecoverySession } from '@/lib/authRecovery';

export interface RecoveryFactor {
  id: string;
  friendlyName: string;
}

type RecoveryStatus =
  | 'checking-session'
  | 'checking-assurance'
  | 'awaiting-mfa'
  | 'verifying-mfa'
  | 'ready'
  | 'updating-password'
  | 'completed'
  | 'invalid-link'
  | 'error';

interface PasswordRecoveryState {
  status: RecoveryStatus;
  factors: RecoveryFactor[];
  selectedFactorId: string | null;
  message: string | null;
}

const INVALID_LINK_MESSAGE = 'Your reset session has expired or is invalid. Please request a new link.';
const MFA_UNAVAILABLE_MESSAGE = 'Two-factor verification is required, but no supported authenticator factor is available. Contact support to recover your account.';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function usePasswordRecovery() {
  const [state, setState] = useState<PasswordRecoveryState>({
    status: 'checking-session',
    factors: [],
    selectedFactorId: null,
    message: null,
  });

  const inspectAssurance = useCallback(async () => {
    setState((current) => ({ ...current, status: 'checking-assurance', message: null }));

    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw error;
    if (!data.currentLevel) throw new Error(INVALID_LINK_MESSAGE);

    if (data.currentLevel === 'aal2' || data.nextLevel !== 'aal2') {
      setState((current) => ({ ...current, status: 'ready', message: null }));
      return;
    }

    const { data: factorData, error: factorError } = await supabase.auth.mfa.listFactors();
    if (factorError) throw factorError;

    const factors = factorData.totp
      .filter((factor) => factor.status === 'verified')
      .map((factor) => ({
        id: factor.id,
        friendlyName: factor.friendly_name || 'Authenticator app',
      }));

    if (factors.length === 0) {
      setState((current) => ({
        ...current,
        status: 'error',
        factors: [],
        selectedFactorId: null,
        message: MFA_UNAVAILABLE_MESSAGE,
      }));
      return;
    }

    setState((current) => ({
      ...current,
      status: 'awaiting-mfa',
      factors,
      selectedFactorId: factors[0].id,
      message: null,
    }));
  }, []);

  useEffect(() => {
    let isActive = true;

    const initialize = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isActive) return;
        if (error) throw error;
        if (!session) {
          setState((current) => ({
            ...current,
            status: 'invalid-link',
            message: INVALID_LINK_MESSAGE,
          }));
          return;
        }
        await inspectAssurance();
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
    };
  }, [inspectAssurance]);

  const selectFactor = useCallback((factorId: string) => {
    setState((current) => ({ ...current, selectedFactorId: factorId }));
  }, []);

  const verifyMfa = useCallback(async (code: string): Promise<boolean> => {
    const factorId = state.selectedFactorId;
    if (!factorId) return false;

    setState((current) => ({ ...current, status: 'verifying-mfa', message: null }));
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;

      const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) throw assuranceError;
      if (assurance.currentLevel !== 'aal2') {
        throw new Error('Two-factor verification did not complete. Please try again.');
      }

      setState((current) => ({ ...current, status: 'ready', message: null }));
      return true;
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'awaiting-mfa',
        message: getErrorMessage(error, 'Could not verify the authentication code.'),
      }));
      return false;
    }
  }, [state.selectedFactorId]);

  const updatePassword = useCallback(async (password: string): Promise<boolean> => {
    if (state.status !== 'ready') return false;

    setState((current) => ({ ...current, status: 'updating-password', message: null }));
    try {
      const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) throw assuranceError;
      if (assurance.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2') {
        throw new Error('Complete two-factor verification before updating your password.');
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) throw signOutError;

      clearRecoverySession();
      setState((current) => ({ ...current, status: 'completed', message: null }));
      return true;
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'ready',
        message: getErrorMessage(error, 'Could not update your password.'),
      }));
      return false;
    }
  }, [state.status]);

  const cancelRecovery = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' });
    clearRecoverySession();
  }, []);

  return {
    ...state,
    selectFactor,
    verifyMfa,
    updatePassword,
    cancelRecovery,
  };
}
