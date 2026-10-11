import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePublicVetoOverlayData } from '../usePublicVetoOverlayData';

const mocks = vi.hoisted(() => ({ get: vi.fn(), realtime: vi.fn(), connected: false }));
vi.mock('@/lib/apiClient', () => ({ apiClient: { get: mocks.get } }));
vi.mock('@/hooks/usePublicVetoRealtime', () => ({ usePublicVetoRealtime: (options: unknown) => {
  mocks.realtime(options); return { connected: mocks.connected };
} }));
const rawState = () => ({ id: 'session', game: 'valorant', status: 'in_progress', maps: [], expiresAt: new Date(Date.now() + 60_000).toISOString() });
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { ...renderHook(() => usePublicVetoOverlayData('token'), { wrapper }), client };
}
beforeEach(() => { mocks.get.mockReset(); mocks.realtime.mockClear(); mocks.connected = false; });
afterEach(() => vi.useRealTimers());

describe('overlay terminal lifecycle', () => {
  it('makes a first-load 404 terminal and stops query and realtime work', async () => {
    mocks.get.mockRejectedValue({ status: 404 });
    const { result, client } = setup();
    await waitFor(() => expect(result.current.expired).toBe(true));
    expect(mocks.realtime.mock.lastCall?.[0].enabled).toBe(false);
    expect(client.getQueryState(['public-map-veto-overlay', 'token'])?.fetchStatus).toBe('idle');
    expect(mocks.get).toHaveBeenCalledTimes(1);
  });
  it('terminates cached success on a later realtime 404 without rejecting refresh', async () => {
    mocks.get.mockImplementation((path: string) => Promise.resolve(path.endsWith('/history') ? [] : rawState()));
    const { result } = setup();
    await waitFor(() => expect(result.current.stateQuery.data?.id).toBe('session'));
    mocks.get.mockRejectedValue({ status: 404 });
    await act(async () => { await mocks.realtime.mock.lastCall?.[0].onUpdated(); });
    await waitFor(() => expect(result.current.expired).toBe(true));
    expect(mocks.realtime.mock.lastCall?.[0].enabled).toBe(false);
  });
  it('expires cached state at its deadline even while realtime is connected', async () => {
    mocks.connected = true;
    mocks.get.mockImplementation((path: string) => Promise.resolve(path.endsWith('/history') ? [] : { ...rawState(), expiresAt: new Date(Date.now() + 100).toISOString() }));
    const { result } = setup();
    await waitFor(() => expect(result.current.stateQuery.data?.id).toBe('session'));
    await waitFor(() => expect(result.current.expired).toBe(true));
    expect(mocks.realtime.mock.lastCall?.[0].enabled).toBe(false);
  });
  it('handles transient refresh failures without marking expiry or an unhandled promise', async () => {
    mocks.get.mockImplementation((path: string) => Promise.resolve(path.endsWith('/history') ? [] : rawState()));
    const { result } = setup();
    await waitFor(() => expect(result.current.stateQuery.data?.id).toBe('session'));
    mocks.get.mockRejectedValue({ status: 503 });
    await act(async () => { await mocks.realtime.mock.lastCall?.[0].onUpdated(); });
    expect(result.current.expired).toBe(false);
  });
});
