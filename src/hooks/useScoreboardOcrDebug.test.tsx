import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useScoreboardOcrDebug } from './useScoreboardOcrDebug';

const upload = vi.hoisted(() => vi.fn());
const get = vi.hoisted(() => vi.fn());
vi.mock('@/lib/apiClient', () => ({ apiClient: { upload, get } }));

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const f = <T,>(value: T) => ({ value, confidence: 0.9 });
const result = {
  game: 'valorant', parserVersion: 'v1', engineVersion: 'e', outcome: f('victory'), allyScore: f(13), enemyScore: f(5),
  map: f({ name: 'Ascent' }), allyTeam: f(null), columns: [], players: [], warnings: [],
};

describe('useScoreboardOcrDebug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({ configured: true, reachable: true, agents: 28 });
  });

  it('loads service health', async () => {
    const { result: hook } = renderHook(() => useScoreboardOcrDebug(), { wrapper: wrapper() });
    await waitFor(() => expect(hook.current.health.data).toEqual({ configured: true, reachable: true, agents: 28 }));
    expect(get).toHaveBeenCalledWith('/api/debug/scoreboard-ocr/health');
  });

  it('posts the screenshot with optional rosters and validates the response', async () => {
    upload.mockResolvedValue({ elapsedMs: 1800, result });
    const { result: hook } = renderHook(() => useScoreboardOcrDebug(), { wrapper: wrapper() });
    const file = new File(['x'], 'shot.png', { type: 'image/png' });

    await act(async () => {
      const data = await hook.current.parse.mutateAsync({ file, team1Names: 'tr1ck\nKenshiro', team2Names: '' });
      expect(data.result.allyScore.value).toBe(13);
    });

    const form: FormData = upload.mock.calls[0][1];
    expect(upload.mock.calls[0][0]).toBe('/api/debug/scoreboard-ocr');
    expect(form.get('team1Names')).toBe('tr1ck\nKenshiro');
  });

  it('rejects non-image files before calling the API', async () => {
    const { result: hook } = renderHook(() => useScoreboardOcrDebug(), { wrapper: wrapper() });
    await act(async () => {
      await expect(hook.current.parse.mutateAsync({ file: new File(['x'], 'a.gif', { type: 'image/gif' }), team1Names: '', team2Names: '' }))
        .rejects.toThrow(/PNG, JPG or WebP/);
    });
    expect(upload).not.toHaveBeenCalled();
  });
});
