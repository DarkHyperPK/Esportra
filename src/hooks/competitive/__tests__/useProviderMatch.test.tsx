import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrimProviderMatch, useTournamentProviderMatch } from '../useProviderMatch';

const mocks = vi.hoisted(() => ({ get: vi.fn(), user: { current: { id: 'u1' } as { id: string } | null } }));
vi.mock('@/hooks/competitive/competitiveApiClient', () => ({ competitiveApiClient: { get: mocks.get } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user.current }) }));

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}

beforeEach(() => { mocks.get.mockReset(); mocks.user.current = { id: 'u1' }; });

describe('useScrimProviderMatch', () => {
  it('reads and validates the verification of a map with a Riot match', async () => {
    mocks.get.mockResolvedValue({ status: 'verified', reasons: [], players: [] });
    const { result } = renderHook(() => useScrimProviderMatch('s1', 2, true), { wrapper });
    await waitFor(() => expect(result.current.data?.status).toBe('verified'));
    expect(mocks.get).toHaveBeenCalledWith('/api/scrims/sessions/s1/games/2/provider-match');
  });

  it('does not ask when the map has no Riot match or nobody is signed in', () => {
    renderHook(() => useScrimProviderMatch('s1', 1, false), { wrapper });
    mocks.user.current = null;
    renderHook(() => useScrimProviderMatch('s1', 1, true), { wrapper });
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('surfaces a malformed response as an error instead of rendering it', async () => {
    mocks.get.mockResolvedValue({ status: 'amazing' });
    const { result } = renderHook(() => useScrimProviderMatch('s1', 1, true), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});

describe('useTournamentProviderMatch', () => {
  it('uses the match and game number', async () => {
    mocks.get.mockResolvedValue({ status: 'none', reasons: [] });
    renderHook(() => useTournamentProviderMatch('m1', 3, true), { wrapper });
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/api/matches/m1/games/3/provider-match'));
  });
});
