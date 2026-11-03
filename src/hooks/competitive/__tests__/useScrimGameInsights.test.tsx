import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrimGameInsights } from '../useScrimGameInsights';

const mocks = vi.hoisted(() => ({ get: vi.fn(), user: { current: { id: 'u1' } as { id: string } | null } }));
vi.mock('@/hooks/competitive/competitiveApiClient', () => ({ competitiveApiClient: { get: mocks.get } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user.current }) }));

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}

beforeEach(() => { mocks.get.mockReset(); mocks.user.current = { id: 'u1' }; });

describe('useScrimGameInsights', () => {
  it('requests nothing without a signed-in user, a session or a valid game number', () => {
    mocks.user.current = null;
    renderHook(() => useScrimGameInsights('s1', 1), { wrapper });
    mocks.user.current = { id: 'u1' };
    renderHook(() => useScrimGameInsights(undefined, 1), { wrapper });
    renderHook(() => useScrimGameInsights('s1', 0), { wrapper });
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('reads the map report from the scrims route, for the chosen team', async () => {
    mocks.get.mockResolvedValue({ bogus: true });
    renderHook(() => useScrimGameInsights('s1', 2, 't 1'), { wrapper });
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/api/scrims/sessions/s1/games/2/insights?team_id=t%201'));
  });

  it('turns a response the app does not understand into an error, not a broken page', async () => {
    mocks.get.mockResolvedValue({ tier: 'wrong' });
    const { result } = renderHook(() => useScrimGameInsights('s1', 1), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
