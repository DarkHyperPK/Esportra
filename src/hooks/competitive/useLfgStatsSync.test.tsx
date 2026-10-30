import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLfgStatsSync } from './useLfgStatsSync';
import { lfgKeys } from './queryKeys';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('./competitiveApiClient', () => ({ competitiveApiClient: api }));
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}
const before = '2026-10-29T10:00:00Z';
const after = '2026-10-29T10:01:00Z';

describe('on-demand LFG stats sync', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('requests visible player stats once and refreshes listings only after a newer completed sync', async () => {
    api.post.mockResolvedValue({ status: 'queued', retryAfterSeconds: 3600, syncedAt: before });
    api.get.mockResolvedValue({ status: 'pending', syncedAt: before });
    const { client, wrapper } = setup();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useLfgStatsSync('listing'), { wrapper });
    await act(async () => { await Promise.all([result.current.sync(), result.current.sync()]); });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/api/competitive/lfg/listing/sync-stats', {});
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/competitive/lfg/listing/stats-sync'));
    expect(result.current.busy).toBe(true);
    api.get.mockResolvedValue({ status: 'partial', syncedAt: after });
    await act(async () => { await client.refetchQueries({ queryKey: lfgKeys.syncState('listing') }); });
    await waitFor(() => expect(result.current.feedback).toBe('Stats updated.'));
    expect(result.current.busy).toBe(false);
    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['my-game-stats', 'valorant'] }));
  });

  it('does not treat an old idle snapshot as completion', async () => {
    api.post.mockResolvedValue({ status: 'syncing', retryAfterSeconds: 15, syncedAt: before });
    api.get.mockResolvedValue({ status: 'partial', syncedAt: '2026-10-29T10:00:00+00:00' });
    const { wrapper } = setup();
    const { result } = renderHook(() => useLfgStatsSync('listing'), { wrapper });
    await act(async () => { await result.current.sync(); });
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(result.current.busy).toBe(true);
    expect(result.current.feedback).not.toBe('Stats updated.');
  });

  it('reloads saved stats during the shared cache window without polling Riot work', async () => {
    api.post.mockResolvedValue({ status: 'cached', retryAfterSeconds: 3600, syncedAt: before });
    const { wrapper } = setup();
    const { result } = renderHook(() => useLfgStatsSync('listing'), { wrapper });
    await act(async () => { await result.current.sync(); });
    await waitFor(() => expect(result.current.seconds).toBeGreaterThan(0));
    await act(async () => { await result.current.sync(); });
    expect(api.post).toHaveBeenCalledTimes(2);
    expect(api.get).not.toHaveBeenCalled();
    expect(result.current.feedback).toBe('Showing the latest saved stats.');
    expect(result.current.busy).toBe(false);
  });

  it('shows queue errors while keeping another attempt possible', async () => {
    api.post.mockRejectedValue(new Error('Stats sync could not be queued. Try again.'));
    const { wrapper } = setup();
    const { result } = renderHook(() => useLfgStatsSync(), { wrapper });
    await act(async () => { await result.current.sync(); });
    expect(result.current.feedback).toContain('could not be queued');
    expect(result.current.busy).toBe(false);
    expect(result.current.seconds).toBe(0);
    expect(api.post).toHaveBeenCalledWith('/api/competitive/game-stats/sync', {});
  });

  it('stops polling and reports a worker failure', async () => {
    api.post.mockResolvedValue({ status: 'queued', retryAfterSeconds: 3600, syncedAt: before });
    api.get.mockResolvedValue({ status: 'error', syncedAt: before });
    const { wrapper } = setup();
    const { result } = renderHook(() => useLfgStatsSync('listing'), { wrapper });
    await act(async () => { await result.current.sync(); });
    await waitFor(() => expect(result.current.feedback).toContain('could not be refreshed'));
    expect(result.current.busy).toBe(false);
    expect(result.current.seconds).toBeGreaterThan(0);
  });

  it('stops polling when status cannot load', async () => {
    api.post.mockResolvedValue({ status: 'queued', retryAfterSeconds: 3600, syncedAt: before });
    api.get.mockRejectedValue(new Error('Listing unavailable'));
    const { wrapper } = setup();
    const { result } = renderHook(() => useLfgStatsSync('listing'), { wrapper });
    await act(async () => { await result.current.sync(); });
    await waitFor(() => expect(result.current.feedback).toContain('status could not load'));
    expect(result.current.busy).toBe(false);
  });
});
