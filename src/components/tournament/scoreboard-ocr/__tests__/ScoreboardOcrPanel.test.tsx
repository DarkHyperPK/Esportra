import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ScoreboardOcrParse, ScoreboardOcrResult } from '@/types/scoreboardOcr';
import type { RiotMatchCandidate } from '@/types/riotMatchCandidate';
import { ScoreboardOcrPanel } from '../ScoreboardOcrPanel';

const parseMock = vi.fn();
const submitRiotMock = vi.fn();

vi.mock('@/hooks/useScoreboardOcr', () => ({
  useScoreboardOcr: () => ({
    parse: { mutateAsync: parseMock, isPending: false, isError: false, error: null, data: undefined },
    submit: { mutateAsync: vi.fn(), isPending: false },
  }),
  useValorantAgents: () => ({ data: [] }),
}));
vi.mock('@/components/ui/EntityAvatar', () => ({ default: ({ name }: { name?: string }) => <span>{name}</span> }));
vi.mock('@/lib/apiClient', () => ({
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));
vi.mock('@/hooks/useSubmitRiotReport', () => ({
  useSubmitRiotReport: () => ({ mutateAsync: submitRiotMock, isPending: false }),
}));

const f = <T,>(value: T | null) => ({ value, confidence: 0.95 });
const result = {
  game: 'valorant', parserVersion: 'v3', engineVersion: 'x', outcome: f('victory'), allyScore: f(15), enemyScore: f(13),
  map: f({ name: 'Sunset' }), allyTeam: f('team1'), columns: ['kills', 'deaths', 'assists'], players: [], warnings: [],
} as unknown as ScoreboardOcrResult;
const candidate = {
  id: 'riot-1', map: 'Sunset', mapId: 'm', queueId: 'custom', startTime: 1, gameLengthMillis: 1, myTeamScore: 15, enemyTeamScore: 13,
  reporterSide: 'Blue', score: '15-13', result: 'Victory', kda: '1/1/1', agent: 'a',
  blueTeam: { roundsWon: 15, won: true }, redTeam: { roundsWon: 13, won: false }, players: [{ gameName: 'DarkHyper' }],
} satisfies RiotMatchCandidate;
const parsed = (confident: boolean): ScoreboardOcrParse => ({
  parseId: 'p', screenshotUrl: 'https://cdn/s.png', mapId: null, team1Id: 't1', team2Id: 't2', result,
  riot: { status: 'found', confident, candidate: confident ? candidate : null, match: null },
});

function renderPanel(onSubmitted = vi.fn()) {
  const view = render(
    <ScoreboardOcrPanel matchId="m1" gameNumber={1} reportedByTeamId="t1" team1Id="t1" team2Id="t2" team1Name="Alpha" team2Name="Bravo"
      onSubmitted={onSubmitted} onManual={vi.fn()} />,
  );
  const input = view.container.querySelector('input[type="file"]');
  if (!input) throw new Error('no file input');
  fireEvent.change(input, { target: { files: [new File(['x'], 'shot.png', { type: 'image/png' })] } });
  return onSubmitted;
}

describe('screenshot upload of a game Riot has', () => {
  beforeEach(() => {
    parseMock.mockReset();
    submitRiotMock.mockReset();
  });

  it('is reported from Riot straight away, with no review', async () => {
    parseMock.mockResolvedValue(parsed(true));
    submitRiotMock.mockResolvedValue({});
    const onSubmitted = renderPanel();

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1));
    expect(submitRiotMock).toHaveBeenCalledTimes(1);
    expect(submitRiotMock.mock.calls[0][0]).toMatchObject({
      candidate,
      ctx: { gameNumber: 1, userTeamId: 't1', team1Id: 't1', team2Id: 't2', screenshotUrls: ['https://cdn/s.png'] },
    });
    expect(screen.queryByRole('button', { name: /send to opponent/i })).not.toBeInTheDocument();
  });

  it('falls back to the review when sending fails', async () => {
    parseMock.mockResolvedValue(parsed(true));
    submitRiotMock.mockRejectedValue(new Error('Conflict'));
    const onSubmitted = renderPanel();

    expect(await screen.findByRole('button', { name: /send to opponent/i })).toBeInTheDocument();
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('opens the review when the game is not provably the same', async () => {
    parseMock.mockResolvedValue(parsed(false));
    renderPanel();

    expect(await screen.findByRole('button', { name: /send to opponent/i })).toBeInTheDocument();
    expect(submitRiotMock).not.toHaveBeenCalled();
  });
});
