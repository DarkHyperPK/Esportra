import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/apiClient';
import { squadUpKeys } from './queryKeys';
import { useEndSquadUp, useSquadUpPresence, useSquadUpSwipe, useStartSquadUp } from './useSquadUp';
import type { SquadUpCard } from '@/schemas/squadUp';

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } } }));

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock('./competitiveApiClient', () => ({ competitiveApiClient: api }));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

const card = (userId: string): SquadUpCard => ({
  userId, username: userId, competitiveTier: 15, matchesAnalyzed: 10, micOn: true, slotsNeeded: 1,
  synergyLabel: 'unknown', synergyScore: 0, likedYou: false,
});
const notFound = () => new ApiError(404, { error: 'NO_ACTIVE_SESSION' }, 'not found');

describe('Squad Up hooks', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('treats a 200 heartbeat as in the squadUp and a 404 as not in the squadUp', async () => {
    api.post.mockResolvedValueOnce({ pendingLikes: 2, inSession: true, hostingLobby: false });
    const first = setup();
    const active = renderHook(() => useSquadUpPresence(true), { wrapper: first.wrapper });
    await waitFor(() => expect(active.result.current.data).toEqual({ active: true, pendingLikes: 2, hostingLobby: false }));
    expect(api.post).toHaveBeenCalledWith('/api/competitive/lfg/swipe/session/heartbeat');

    api.post.mockRejectedValueOnce(notFound());
    const second = setup();
    const inactive = renderHook(() => useSquadUpPresence(true), { wrapper: second.wrapper });
    await waitFor(() => expect(inactive.result.current.data).toEqual({ active: false, pendingLikes: 0, hostingLobby: false }));
  });

  it('keeps presence alive for a host with a lobby but no Duo session', async () => {
    api.post.mockResolvedValueOnce({ pendingLikes: 0, inSession: false, hostingLobby: true });
    const { wrapper } = setup();
    const host = renderHook(() => useSquadUpPresence(true), { wrapper });
    await waitFor(() => expect(host.result.current.data).toEqual({ active: false, pendingLikes: 0, hostingLobby: true }));
  });

  it('does not probe presence until enabled', () => {
    const { wrapper } = setup();
    renderHook(() => useSquadUpPresence(false), { wrapper });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('validates input before starting and sends the session settings', async () => {
    api.post.mockResolvedValue({ id: 's1', region: 'na', competitiveTier: 15, micOn: true, slotsNeeded: 2 });
    const { wrapper } = setup();
    const { result } = renderHook(() => useStartSquadUp(), { wrapper });
    await act(async () => { await expect(result.current.mutateAsync({ micOn: true, slotsNeeded: 9, area: 'south-asia' })).rejects.toThrow(); });
    await act(async () => { await expect(result.current.mutateAsync({ micOn: true, slotsNeeded: 2, area: 'south-asia', note: 'x'.repeat(101) })).rejects.toThrow(); });
    expect(api.post).not.toHaveBeenCalled();
    await act(async () => { await result.current.mutateAsync({ micOn: true, slotsNeeded: 2, area: 'south-asia', note: '  I smoke  ' }); });
    expect(api.post).toHaveBeenCalledWith('/api/competitive/lfg/swipe/session', { micOn: true, slotsNeeded: 2, area: 'south-asia', note: 'I smoke' });
  });

  it('removes a swiped card immediately and puts it back when the swipe fails', async () => {
    api.post.mockRejectedValue(new ApiError(404, { error: 'TARGET_NOT_ACTIVE' }, 'gone'));
    const { client, wrapper } = setup();
    client.setQueryData(squadUpKeys.cards(), [card('a'), card('b'), card('c')]);
    const { result } = renderHook(() => useSquadUpSwipe(), { wrapper });
    await act(async () => { await result.current.mutateAsync({ card: card('a'), direction: 'right' }).catch(() => undefined); });
    expect(api.post).toHaveBeenCalledWith('/api/competitive/lfg/swipe/a/right');
    expect(client.getQueryData<SquadUpCard[]>(squadUpKeys.cards())?.map((c) => c.userId)).toEqual(['a', 'b', 'c']);
  });

  it('keeps the card out of the deck after a successful left swipe and parses a right-swipe match', async () => {
    const { client, wrapper } = setup();
    client.setQueryData(squadUpKeys.cards(), [card('a'), card('b'), card('c')]);
    const { result } = renderHook(() => useSquadUpSwipe(), { wrapper });
    api.post.mockResolvedValueOnce(undefined);
    await act(async () => { await result.current.mutateAsync({ card: card('a'), direction: 'left' }); });
    expect(client.getQueryData<SquadUpCard[]>(squadUpKeys.cards())?.map((c) => c.userId)).toEqual(['b', 'c']);

    api.post.mockResolvedValueOnce({
      matched: true, sessionEnded: false,
      match: { matchId: 'm1', conversationId: 'c1', matchedAt: '2026-11-05T10:00:00Z', matchedUserId: 'b', matchedUsername: 'b' },
    });
    let outcome;
    await act(async () => { outcome = await result.current.mutateAsync({ card: card('b'), direction: 'right' }); });
    expect(outcome).toMatchObject({ matched: true, match: { conversationId: 'c1' } });
  });

  it('reads the summary before leaving the squadUp', async () => {
    api.get.mockResolvedValue({ swipesRight: 2, swipesLeft: 1, matchesCount: 1, durationSeconds: 300 });
    api.delete.mockResolvedValue(undefined);
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useEndSquadUp(), { wrapper });
    let stats;
    await act(async () => { stats = await result.current.mutateAsync(); });
    expect(stats).toMatchObject({ matchesCount: 1 });
    expect(api.get).toHaveBeenCalledWith('/api/competitive/lfg/swipe/session/stats');
    expect(api.delete).toHaveBeenCalledWith('/api/competitive/lfg/swipe/session');
    expect(client.getQueryData(squadUpKeys.presence())).toEqual({ active: false, pendingLikes: 0 });
  });
});
