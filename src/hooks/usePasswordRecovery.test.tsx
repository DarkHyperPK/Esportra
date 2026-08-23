import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePasswordRecovery } from './usePasswordRecovery';

const post = vi.hoisted(() => vi.fn());

vi.mock('@/lib/apiClient', () => ({
  apiClient: { post },
}));

vi.mock('@/lib/resetClientSession', () => ({
  resetClientSessionForAuthChange: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('usePasswordRecovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/auth/recovery?token_hash=abc123&type=recovery');
    post.mockResolvedValue({ success: true });
  });

  it('updates the password via server-side endpoint', async () => {
    const { result } = renderHook(() => usePasswordRecovery(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      expect(await result.current.updatePassword('StrongPass1')).toBe(true);
    });

    expect(post).toHaveBeenCalledWith('/api/auth/set-password', {
      password: 'StrongPass1',
      tokenHash: 'abc123',
      type: 'recovery',
    });
    expect(result.current.status).toBe('completed');
  });

  it('rejects when token_hash is missing from URL', async () => {
    window.history.replaceState({}, '', '/auth/recovery');
    const { result } = renderHook(() => usePasswordRecovery(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.status).toBe('invalid-link'));

    await act(async () => {
      expect(await result.current.updatePassword('StrongPass1')).toBe(false);
    });
    expect(post).not.toHaveBeenCalled();
  });

  it('stays ready when the API call fails with a non-expiry error', async () => {
    post.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => usePasswordRecovery(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      expect(await result.current.updatePassword('StrongPass1')).toBe(false);
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.message).toBe('Network error');
  });

  it('shows invalid-link when the API returns an expired token error', async () => {
    post.mockRejectedValue(new Error('Invalid or expired recovery token.'));
    const { result } = renderHook(() => usePasswordRecovery(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      expect(await result.current.updatePassword('StrongPass1')).toBe(false);
    });

    expect(result.current.status).toBe('invalid-link');
  });
});
