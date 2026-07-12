import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePasswordRecovery } from './usePasswordRecovery';

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
  listFactors: vi.fn(),
  challenge: vi.fn(),
  verify: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: auth.getSession,
      updateUser: auth.updateUser,
      signOut: auth.signOut,
      mfa: {
        getAuthenticatorAssuranceLevel: auth.getAuthenticatorAssuranceLevel,
        listFactors: auth.listFactors,
        challenge: auth.challenge,
        verify: auth.verify,
      },
    },
  },
}));

const session = { user: { id: 'user-1' } };

function assurance(currentLevel: 'aal1' | 'aal2', nextLevel: 'aal1' | 'aal2') {
  return { data: { currentLevel, nextLevel, currentAuthenticationMethods: [] }, error: null };
}

describe('usePasswordRecovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getSession.mockResolvedValue({ data: { session }, error: null });
    auth.listFactors.mockResolvedValue({ data: { all: [], totp: [], phone: [] }, error: null });
    auth.challenge.mockResolvedValue({ data: { id: 'challenge-1', type: 'totp', expires_at: 0 }, error: null });
    auth.verify.mockResolvedValue({ data: {}, error: null });
    auth.updateUser.mockResolvedValue({ data: {}, error: null });
    auth.signOut.mockResolvedValue({ error: null });
  });

  it('allows non-MFA recovery and signs out after updating the password', async () => {
    auth.getAuthenticatorAssuranceLevel.mockResolvedValue(assurance('aal1', 'aal1'));
    const { result } = renderHook(() => usePasswordRecovery());

    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      expect(await result.current.updatePassword('StrongPass1')).toBe(true);
    });

    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'StrongPass1' });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(result.current.status).toBe('completed');
  });

  it('requires and verifies TOTP before changing an MFA-protected password', async () => {
    auth.getAuthenticatorAssuranceLevel
      .mockResolvedValueOnce(assurance('aal1', 'aal2'))
      .mockResolvedValueOnce(assurance('aal2', 'aal2'))
      .mockResolvedValueOnce(assurance('aal2', 'aal2'));
    auth.listFactors.mockResolvedValue({
      data: {
        all: [],
        phone: [],
        totp: [{
          id: 'factor-1',
          friendly_name: 'Primary authenticator',
          factor_type: 'totp',
          status: 'verified',
          created_at: '',
          updated_at: '',
        }],
      },
      error: null,
    });

    const { result } = renderHook(() => usePasswordRecovery());
    await waitFor(() => expect(result.current.status).toBe('awaiting-mfa'));

    await act(async () => {
      expect(await result.current.verifyMfa('123456')).toBe(true);
    });
    expect(auth.challenge).toHaveBeenCalledWith({ factorId: 'factor-1' });
    expect(auth.verify).toHaveBeenCalledWith({
      factorId: 'factor-1',
      challengeId: 'challenge-1',
      code: '123456',
    });

    await act(async () => {
      expect(await result.current.updatePassword('StrongPass1')).toBe(true);
    });
    expect(auth.updateUser).toHaveBeenCalledTimes(1);
  });

  it('does not update the password when AAL2 is required without a supported factor', async () => {
    auth.getAuthenticatorAssuranceLevel.mockResolvedValue(assurance('aal1', 'aal2'));
    const { result } = renderHook(() => usePasswordRecovery());

    await waitFor(() => expect(result.current.status).toBe('error'));

    await act(async () => {
      expect(await result.current.updatePassword('StrongPass1')).toBe(false);
    });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
});
