import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrimMapPicks } from '../useScrimMapPicks';

const mocks = vi.hoisted(() => ({ get: vi.fn(), user: { current: { id: 'u1' } as { id: string } | null } }));
vi.mock('@/hooks/competitive/competitiveApiClient', () => ({ competitiveApiClient: { get: mocks.get } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user.current }) }));

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}

beforeEach(() => { mocks.get.mockReset(); mocks.user.current = { id: 'u1' }; });

describe('useScrimMapPicks', () => {
  it('requests nothing when signed out, without a team, or while its tab is closed', () => {
    mocks.user.current = null;
    renderHook(() => useScrimMapPicks('t1'), { wrapper });
    mocks.user.current = { id: 'u1' };
    renderHook(() => useScrimMapPicks(undefined), { wrapper });
    renderHook(() => useScrimMapPicks('t1', false), { wrapper });
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('reads the picks from the scrims route and parses them', async () => {
    mocks.get.mockResolvedValue({ teamId: 't1', hasData: false, truncated: false, picks: { vetoes: 0, unattributed: 0, maps: [], byPicker: [], yourSideChoices: [] } });
    const { result } = renderHook(() => useScrimMapPicks('t1'), { wrapper });
    await waitFor(() => expect(result.current.data?.hasData).toBe(false));
    expect(mocks.get).toHaveBeenCalledWith('/api/scrims/teams/t1/map-picks');
  });

  it('turns a response the app does not understand into an error', async () => {
    mocks.get.mockResolvedValue({ picks: 'wrong' });
    const { result } = renderHook(() => useScrimMapPicks('t1'), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
