import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnalyticsVisibility } from '../useAnalyticsVisibility';

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('@/hooks/competitive/competitiveApiClient', () => ({ competitiveApiClient: { get: mocks.get, put: mocks.put } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => { mocks.get.mockReset(); mocks.put.mockReset(); });

describe('useAnalyticsVisibility', () => {
  it('is private until the player says otherwise', async () => {
    mocks.get.mockResolvedValue({ game: 'valorant', visibility: 'private' });
    const { result } = renderHook(() => useAnalyticsVisibility(), { wrapper });
    expect(result.current.visibility).toBe('private');
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mocks.get).toHaveBeenCalledWith('/api/competitive/analytics-visibility?game=valorant');
  });

  it('saves a change and reflects it', async () => {
    mocks.get.mockResolvedValue({ game: 'valorant', visibility: 'private' });
    mocks.put.mockResolvedValue({ game: 'valorant', visibility: 'public' });
    const { result } = renderHook(() => useAnalyticsVisibility(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.save('public'); });

    expect(mocks.put).toHaveBeenCalledWith('/api/competitive/analytics-visibility', { game: 'valorant', visibility: 'public' });
    await waitFor(() => expect(result.current.visibility).toBe('public'));
  });

  it('rolls back and rejects when the save fails, so the screen can say so', async () => {
    mocks.get.mockResolvedValue({ game: 'valorant', visibility: 'private' });
    mocks.put.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAnalyticsVisibility(), { wrapper });
    await waitFor(() => expect(result.current.visibility).toBe('private'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await expect(result.current.save('public')).rejects.toThrow('boom'); });

    expect(result.current.visibility).toBe('private');
  });
});
