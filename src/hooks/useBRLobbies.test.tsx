import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useBRLobbies } from '@/hooks/useBRLobbies';

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(async () => []),
    patch: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
  getApiErrorMessage: (_error: unknown, options?: { context?: string }) => options?.context ?? 'mock error',
}));

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  };
};

describe('useBRLobbies saveLobbySchedules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists every changed lobby and reports all as saved', async () => {
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'l1' });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBRLobbies(null, null), { wrapper });

    await act(async () => {
      const res = await result.current.saveLobbySchedules.mutateAsync({
        scheduledAtByLobby: { l1: '2026-08-05T09:30:00.000Z' },
      });
      expect(res).toEqual({ saved: ['l1'], failed: 0, firstError: null });
    });

    expect(apiClient.patch).toHaveBeenCalledWith('/api/br/lobbies/l1', {
      scheduledAt: '2026-08-05T09:30:00.000Z',
    });
  });

  it('keeps persisting remaining lobbies after a failure and reports the partial outcome truthfully', async () => {
    const patch = apiClient.patch as ReturnType<typeof vi.fn>;
    patch.mockRejectedValueOnce(new Error('network down'));
    patch.mockResolvedValue({ id: 'l2' });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBRLobbies(null, null), { wrapper });

    await act(async () => {
      const res = await result.current.saveLobbySchedules.mutateAsync({
        scheduledAtByLobby: {
          l1: '2026-08-05T09:30:00.000Z',
          l2: '2026-08-05T10:00:00.000Z',
        },
      });
      expect(res.saved).toEqual(['l2']);
      expect(res.failed).toBe(1);
      expect((res.firstError as Error).message).toBe('network down');
    });

    expect(patch).toHaveBeenCalledTimes(2);
    expect(patch).toHaveBeenNthCalledWith(2, '/api/br/lobbies/l2', {
      scheduledAt: '2026-08-05T10:00:00.000Z',
    });
  });

  it('reports failure without aborting when every row fails', async () => {
    (apiClient.patch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBRLobbies(null, null), { wrapper });

    await act(async () => {
      const res = await result.current.saveLobbySchedules.mutateAsync({
        scheduledAtByLobby: { l1: '2026-08-05T09:30:00.000Z' },
      });
      expect(res.saved).toEqual([]);
      expect(res.failed).toBe(1);
      expect((res.firstError as Error).message).toBe('offline');
    });
  });
});
