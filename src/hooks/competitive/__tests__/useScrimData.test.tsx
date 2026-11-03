import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrimData } from '../useScrimData';

const mocks = vi.hoisted(() => ({ get: vi.fn(), user: { current: { id: 'u1' } as { id: string } | null } }));
vi.mock('@/hooks/competitive/competitiveApiClient', () => ({ competitiveApiClient: { get: mocks.get } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user.current }) }));

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}

beforeEach(() => { mocks.get.mockReset(); mocks.user.current = { id: 'u1' }; });

describe('useScrimData', () => {
  it('requests nothing without a signed-in user (the API signs a 401 out) or without a team', () => {
    mocks.user.current = null;
    renderHook(() => useScrimData('t1'), { wrapper });
    mocks.user.current = { id: 'u1' };
    renderHook(() => useScrimData(undefined), { wrapper });
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('reads the team’s scrim data from the scrims route', async () => {
    mocks.get.mockResolvedValue({ bogus: true });
    renderHook(() => useScrimData('t1'), { wrapper });
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/api/scrims/teams/t1/data'));
  });

  it('turns a response the app does not understand into an error, not a broken page', async () => {
    mocks.get.mockResolvedValue({ coverage: 'wrong' });
    const { result } = renderHook(() => useScrimData('t1'), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
