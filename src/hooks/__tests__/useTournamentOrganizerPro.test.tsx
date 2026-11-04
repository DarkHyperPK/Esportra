import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    constructor(public readonly status: number, message: string) {
      super(message);
    }
  }
  return { get: vi.fn(), ApiError };
});

vi.mock('@/lib/apiClient', () => ({ apiClient: { get: mocks.get }, ApiError: mocks.ApiError }));

import { useTournamentOrganizerPro } from '../useTournamentOrganizerPro';

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const quota = (isOrganizerPro: boolean) => ({
  usedThisMonth: 0,
  monthlyLimit: 2,
  resetsAt: '2026-12-01T00:00:00Z',
  isOrganizerPro,
});

beforeEach(() => {
  mocks.get.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('useTournamentOrganizerPro', () => {
  it('uses the per-tournament flag, not the account-level one', async () => {
    mocks.get.mockImplementation((url: string) =>
      url.includes('/organizer-pro')
        ? Promise.resolve({ tournamentId: 't1', isOrganizerPro: false })
        : Promise.resolve(quota(true)),
    );

    const { result } = renderHook(() => useTournamentOrganizerPro('t1'), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isOrganizerPro).toBe(false);
    expect(mocks.get).toHaveBeenCalledWith('/api/tournaments/t1/organizer-pro');
  });

  it('unlocks a grandfathered or pro tournament even when the account has no pro license', async () => {
    mocks.get.mockImplementation((url: string) =>
      url.includes('/organizer-pro')
        ? Promise.resolve({ tournamentId: 't2', isOrganizerPro: true })
        : Promise.resolve(quota(false)),
    );

    const { result } = renderHook(() => useTournamentOrganizerPro('t2'), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isOrganizerPro).toBe(true);
  });

  it('falls back to the account-level flag when the endpoint is not deployed', async () => {
    mocks.get.mockImplementation((url: string) =>
      url.includes('/organizer-pro')
        ? Promise.reject(new mocks.ApiError(404, 'Not found'))
        : Promise.resolve(quota(false)),
    );

    const { result } = renderHook(() => useTournamentOrganizerPro('t3'), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isOrganizerPro).toBe(false));
  });

  it('fails open on other errors so the organizer is never blocked by the UI', async () => {
    mocks.get.mockImplementation((url: string) =>
      url.includes('/organizer-pro')
        ? Promise.reject(new mocks.ApiError(500, 'boom'))
        : Promise.resolve(quota(false)),
    );

    const { result } = renderHook(() => useTournamentOrganizerPro('t4'), { wrapper: makeWrapper() });

    // One retry with the default 1s backoff before the query settles in error.
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });
    expect(result.current.isOrganizerPro).toBe(true);
  });
});
