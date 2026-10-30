import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } } }));
vi.mock('@/lib/ghostModeSession', () => ({ readGhostModeSession: () => null }));

afterEach(() => vi.unstubAllGlobals());

describe('scoped GET deduplication', () => {
  it('shares concurrent requests within a viewer scope but never across scopes', async () => {
    const pending: Array<(value: Response) => void> = [];
    const fetchMock = vi.fn(() => new Promise<Response>(resolve => pending.push(resolve)));
    vi.stubGlobal('fetch', fetchMock);
    const guest = apiClient.get('/api/competitive/lfg?game=valorant', 'guest');
    const guestAgain = apiClient.get('/api/competitive/lfg?game=valorant', 'guest');
    const signedIn = apiClient.get('/api/competitive/lfg?game=valorant', 'viewer');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    pending[0](new Response(JSON.stringify([{ id: 'guest' }]), { status: 200 }));
    pending[1](new Response(JSON.stringify([{ id: 'viewer' }]), { status: 200 }));
    expect(await guest).toEqual([{ id: 'guest' }]);
    expect(await guestAgain).toEqual([{ id: 'guest' }]);
    expect(await signedIn).toEqual([{ id: 'viewer' }]);
  });
});
