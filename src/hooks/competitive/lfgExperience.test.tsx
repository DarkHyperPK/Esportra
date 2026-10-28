import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useInfiniteLfg } from './useDiscovery';
import { useMyGameStats, useSaveLfgDraft, useSetLfgSaved, useExpressInterest, useWithdrawInterest } from './useLfg';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('@/hooks/competitive/competitiveApiClient', () => ({ competitiveApiClient: api }));
vi.mock('@/lib/apiClient', () => ({ apiClient: api }));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

describe('LFG integration hooks', () => {
  beforeEach(() => vi.resetAllMocks());

  it('refreshes LFG listings after a queued stats sync completes', async () => {
    api.get.mockResolvedValueOnce({ syncStatus: 'pending' }).mockResolvedValueOnce({ syncStatus: 'complete', popularAgents: [{ agentId: 'jett', gamesPlayed: 5 }] });
    const { client, wrapper } = setup();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useMyGameStats('valorant'), { wrapper });
    await waitFor(() => expect(result.current.data?.syncStatus).toBe('pending'));
    await act(async () => { await result.current.refetch(); });
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['lfg'] }));
    expect(result.current.data?.popularAgents?.[0].gamesPlayed).toBe(5);
  });

  it('passes game-specific filters and paginates discovery on the canonical cache key', async () => {
    api.get.mockImplementation((path: string) => Promise.resolve(path.includes('offset=30') ? [] : Array.from({ length: 30 }, (_, i) => ({ id: String(i) }))));
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useInfiniteLfg({ game: 'cs2', intent: ['looking_for_team'], roles: ['awper'], query: 'player name', language: 'en', server: 'dubai', savedOnly: true }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const query = new URLSearchParams(api.get.mock.calls[0][0].split('?')[1]);
    expect(Object.fromEntries(query)).toMatchObject({ game: 'cs2', intent: 'looking_for_team', preferred_roles: 'awper', q: 'player name', language: 'en', server: 'dubai', saved_only: 'true', limit: '30' });
    expect(client.getQueryCache().findAll({ queryKey: ['lfg', 'discover'] })).toHaveLength(1);
    const fetched = await act(async () => result.current.fetchNextPage());
    expect(api.get.mock.calls[1][0]).toContain('offset=30');
    expect(fetched.error).toBeNull();
    expect(fetched.data?.pages[1]).toEqual([]);
    expect(fetched.hasNextPage).toBe(false);
  });

  it('reuses the saved draft after a publish failure', async () => {
    api.post.mockImplementation((path: string) => {
      if (path === '/api/competitive/lfg') return Promise.resolve({ id: 'draft-1' });
      if (api.post.mock.calls.filter(call => call[0].endsWith('/publish')).length === 1) return Promise.reject(new Error('Publish failed'));
      return Promise.resolve({ id: 'draft-1' });
    });
    api.put.mockResolvedValue({ id: 'draft-1' });
    const { wrapper } = setup();
    const { result } = renderHook(() => useSaveLfgDraft(), { wrapper });
    const input = { request: { gameSlug: 'valorant', intent: 'looking_for_team' as const, description: 'Ready to play' }, publish: true };
    await act(async () => { await expect(result.current.mutateAsync(input)).rejects.toThrow('Publish failed'); });
    expect(result.current.draftId).toBe('draft-1');
    await act(async () => { await result.current.mutateAsync(input); });
    expect(api.post.mock.calls.filter(call => call[0] === '/api/competitive/lfg')).toHaveLength(1);
    expect(api.post.mock.calls.filter(call => call[0].endsWith('/publish'))).toHaveLength(2);
    expect(api.put).toHaveBeenCalledWith('/api/competitive/lfg/draft-1', expect.objectContaining({ description: 'Ready to play' }));
  });

  it('invalidates discovery and saved data after a successful save', async () => {
    api.put.mockResolvedValue(undefined);
    const { client, wrapper } = setup();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useSetLfgSaved(), { wrapper });
    await act(async () => { await result.current.mutateAsync({ id: 'listing-1', saved: true }); });
    expect(api.put).toHaveBeenCalledWith('/api/competitive/lfg/listing-1/saved', {});
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['lfg'] });
  });
  it('updates detail immediately on invite and withdrawal and refreshes after errors', async () => {
    api.post.mockResolvedValue({ id: 'new-request', status: 'expressed' });
    api.delete.mockResolvedValue({ success: true });
    const { client, wrapper } = setup();
    client.setQueryData(['lfg', 'detail', 'listing'], { id: 'listing', viewerInterestStatus: 'withdrawn' });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const invite = renderHook(() => useExpressInterest('listing'), { wrapper });
    await act(async () => { await invite.result.current.mutateAsync({ message: 'Hello' }); });
    expect(client.getQueryData(['lfg', 'detail', 'listing'])).toMatchObject({ viewerInterestId: 'new-request', viewerInterestStatus: 'expressed' });
    const withdraw = renderHook(() => useWithdrawInterest('listing'), { wrapper });
    await act(async () => { await withdraw.result.current.mutateAsync(); });
    expect(client.getQueryData(['lfg', 'detail', 'listing'])).toMatchObject({ viewerInterestStatus: 'withdrawn' });
    api.post.mockRejectedValue(new Error('offline'));
    await act(async () => { await expect(invite.result.current.mutateAsync({ message: 'Hello again' })).rejects.toThrow('offline'); });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['lfg'] });
  });

});
