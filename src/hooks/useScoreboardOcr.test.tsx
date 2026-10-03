import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useScoreboardOcr } from './useScoreboardOcr';
import { useOverlayMatchSource } from './useOverlayMatchSource';

const upload = vi.hoisted(() => vi.fn());
const post = vi.hoisted(() => vi.fn());
const get = vi.hoisted(() => vi.fn());

vi.mock('@/lib/apiClient', () => ({ apiClient: { upload, post, get } }));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const png = () => new File(['x'], 'scoreboard.png', { type: 'image/png' });
const field = <T,>(value: T) => ({ value, confidence: 0.9 });
const validParse = {
  parseId: '11111111-1111-4111-8111-111111111111',
  screenshotUrl: 'https://cdn.example.com/s.png',
  mapId: null,
  team1Id: '33333333-3333-4333-8333-333333333333',
  team2Id: '44444444-4444-4444-8444-444444444444',
  result: {
    game: 'valorant', parserVersion: 'v1', engineVersion: 'e', outcome: field('victory'), allyScore: field(13),
    enemyScore: field(5), map: field({ name: 'Bind' }), allyTeam: field('team1'), columns: ['acs'], players: [], warnings: [],
  },
};

describe('useScoreboardOcr', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uploads the screenshot with competitor and game, and returns the validated parse', async () => {
    upload.mockResolvedValue(validParse);
    const { result } = renderHook(() => useScoreboardOcr('match-1'), { wrapper: createWrapper() });

    let parsed: unknown;
    await act(async () => {
      parsed = await result.current.parse.mutateAsync({ file: png(), reportedByTeamId: 'team-a', gameNumber: 2 });
    });

    expect(upload).toHaveBeenCalledWith('/api/matches/match-1/reports/parse-screenshot', expect.any(FormData));
    const form: FormData = upload.mock.calls[0][1];
    expect(form.get('reportedByTeamId')).toBe('team-a');
    expect(form.get('gameNumber')).toBe('2');
    expect(parsed).toMatchObject({ parseId: validParse.parseId });
  });

  it('rejects unsupported files before uploading', async () => {
    const { result } = renderHook(() => useScoreboardOcr('match-1'), { wrapper: createWrapper() });
    const gif = new File(['x'], 'a.gif', { type: 'image/gif' });

    await act(async () => {
      await expect(result.current.parse.mutateAsync({ file: gif, reportedByTeamId: 't', gameNumber: 1 })).rejects.toThrow(/PNG, JPG or WebP/);
    });
    expect(upload).not.toHaveBeenCalled();
  });

  it('refuses malformed server responses instead of pre-filling garbage', async () => {
    upload.mockResolvedValue({ parseId: 'nope' });
    const { result } = renderHook(() => useScoreboardOcr('match-1'), { wrapper: createWrapper() });

    await act(async () => {
      await expect(result.current.parse.mutateAsync({ file: png(), reportedByTeamId: 't', gameNumber: 1 })).rejects.toThrow(/Enter the result manually/);
    });
  });
});

describe('useOverlayMatchSource', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads a screenshot report snapshot by parse id, preferring the accepted report', async () => {
    const snapshot = (tag: string) => ({ enrichedSnapshot: { matchInfo: { matchId: tag }, teams: [], players: [] } });
    get.mockResolvedValue([
      { id: 'r1', status: 'disputed', ocr_parse_id: 'p1', match_data: snapshot('old') },
      { id: 'r2', status: 'accepted', ocr_parse_id: 'p1', match_data: snapshot('accepted') },
      { id: 'r3', status: 'pending', ocr_parse_id: 'p2', match_data: snapshot('other') },
    ]);

    const { result } = renderHook(
      () => useOverlayMatchSource({ region: 'eu', riotMatchId: '', esportraMatchId: 'm1', parseId: 'p1' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.data?.matchInfo.matchId).toBe('accepted'));
    expect(get).toHaveBeenCalledWith('/api/matches/m1/reports');
    expect(post).not.toHaveBeenCalled();
  });

  it('reports a clear error when the parse has no report', async () => {
    get.mockResolvedValue([]);
    const { result } = renderHook(
      () => useOverlayMatchSource({ region: 'eu', riotMatchId: '', esportraMatchId: 'm1', parseId: 'missing' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
  });

  it('keeps the Riot path for Riot overlays', async () => {
    post.mockResolvedValue({ matchInfo: { matchId: 'riot-1' }, teams: [], players: [] });
    const { result } = renderHook(
      () => useOverlayMatchSource({ region: 'eu', riotMatchId: 'riot-1', esportraMatchId: '', parseId: '' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.data?.matchInfo.matchId).toBe('riot-1'));
    expect(post).toHaveBeenCalledWith('/api/integrations/riot/enriched-match', { region: 'eu', matchId: 'riot-1' });
  });
});
