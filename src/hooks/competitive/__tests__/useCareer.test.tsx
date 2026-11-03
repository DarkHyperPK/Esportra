import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlayerCareer, useTeamCareer } from '../useCareer';

const mocks = vi.hoisted(() => ({ get: vi.fn(), user: { current: { id: 'u1' } as { id: string } | null } }));
vi.mock('@/hooks/competitive/competitiveApiClient', () => ({ competitiveApiClient: { get: mocks.get } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user.current }) }));

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}

const page = (over: Record<string, unknown> = {}) => ({ access: 'self', matches: [], nextBefore: null, hasMore: false, ...over });

beforeEach(() => { mocks.get.mockReset(); mocks.user.current = { id: 'u1' }; });

describe('usePlayerCareer', () => {
  it('requests nothing for a signed-out visitor, because the API would sign them out', () => {
    mocks.user.current = null;
    const { result } = renderHook(() => usePlayerCareer('p1'), { wrapper });
    expect(result.current.signedIn).toBe(false);
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('loads the summary and the first page of games together', async () => {
    mocks.get.mockImplementation(async (path: string) =>
      path.includes('/matches') ? page() : { access: 'none' });
    const { result } = renderHook(() => usePlayerCareer('p1'), { wrapper });
    await waitFor(() => expect(result.current.summary.data).toEqual({ access: 'none' }));
    await waitFor(() => expect(result.current.games.data?.pages).toHaveLength(1));
    expect(mocks.get).toHaveBeenCalledWith('/api/competitive/players/p1/career?game=valorant');
    expect(mocks.get).toHaveBeenCalledWith('/api/competitive/players/p1/career/matches');
  });

  it('asks for older games with the cursor from the last page', async () => {
    mocks.get.mockImplementation(async (path: string) => {
      if (!path.includes('/matches')) return { access: 'none' };
      return path.includes('before=') ? page() : page({ nextBefore: '2026-10-03T12:00:00.0000000Z', hasMore: true });
    });
    const { result } = renderHook(() => usePlayerCareer('p1'), { wrapper });
    await waitFor(() => expect(result.current.games.hasNextPage).toBe(true));
    await result.current.games.fetchNextPage();
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/api/competitive/players/p1/career/matches?before=2026-10-03T12%3A00%3A00.0000000Z'));
    await waitFor(() => expect(result.current.games.hasNextPage).toBe(false));
  });

  it('turns a response the app does not understand into an error, not a broken screen', async () => {
    mocks.get.mockResolvedValue({ access: 'mystery' });
    const { result } = renderHook(() => usePlayerCareer('p1'), { wrapper });
    await waitFor(() => expect(result.current.summary.isError).toBe(true));
  });
});

describe('useTeamCareer', () => {
  it('reads the team record from the team routes', async () => {
    mocks.get.mockImplementation(async (path: string) => path.includes('/matches') ? page({ access: 'public' }) : { access: 'bogus' });
    const { result } = renderHook(() => useTeamCareer('t1'), { wrapper });
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/api/competitive/teams/t1/career'));
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/api/competitive/teams/t1/career/matches'));
    await waitFor(() => expect(result.current.summary.isError).toBe(true));
  });
});
