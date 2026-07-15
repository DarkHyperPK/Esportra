import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePasswordRecovery } from './usePasswordRecovery';

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
}));
const postWithToken = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth },
}));

vi.mock('@/lib/apiClient', () => ({
  apiClient: { postWithToken },
}));

const session = { access_token: 'recovery-token', user: { id: 'user-1' } };

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('usePasswordRecovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    window.history.replaceState({}, '', '/auth/recovery#type=recovery');
    auth.getSession.mockResolvedValue({ data: { session }, error: null });
    auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    auth.updateUser.mockResolvedValue({ data: {}, error: null });
    auth.signOut.mockResolvedValue({ error: null });
    postWithToken.mockResolvedValue({ completed: true });
  });

  it('updates the password, completes server revocation, and signs out locally', async () => {
    const { result } = renderHook(() => usePasswordRecovery(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      expect(await result.current.updatePassword('StrongPass1')).toBe(true);
    });

    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'StrongPass1' });
    expect(postWithToken).toHaveBeenCalledWith(
      '/api/auth/password-reset-completed',
      'recovery-token',
    );
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(result.current.status).toBe('completed');
  });

  it('rejects a normal session without recovery provenance', async () => {
    window.history.replaceState({}, '', '/auth/recovery');
    const { result } = renderHook(() => usePasswordRecovery(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.status).toBe('invalid-link'));

    await act(async () => {
      expect(await result.current.updatePassword('StrongPass1')).toBe(false);
    });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it('keeps the recovery session available when updating the password fails', async () => {
    auth.updateUser.mockResolvedValue({ data: {}, error: new Error('Update failed') });
    const { result } = renderHook(() => usePasswordRecovery(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      expect(await result.current.updatePassword('StrongPass1')).toBe(false);
    });

    expect(auth.signOut).not.toHaveBeenCalled();
    expect(result.current.status).toBe('ready');
  });
});
