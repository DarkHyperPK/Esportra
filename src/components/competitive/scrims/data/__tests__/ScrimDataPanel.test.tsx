import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScrimDataPanel } from '../ScrimDataPanel';
import type { Coverage, PlayerSummary, ScrimData } from '@/types/scrimData';

const mocks = vi.hoisted(() => ({ useScrimData: vi.fn() }));
vi.mock('@/hooks/competitive/useScrimData', () => ({ useScrimData: mocks.useScrimData }));

const coverage = (over: Partial<Coverage> = {}): Coverage => ({
  maps: 6, full: 2, screenshot: 2, scoreOnly: 2, riotPending: 0, riotNotVerified: 0, awaitingConfirmation: 0, disputed: 0, queueGames: 0, ...over,
});
const side = { played: 0, won: 0, pct: null };

const player = (over: Partial<PlayerSummary> = {}): PlayerSummary => ({
  userId: 'u1', name: 'Nova', games: 4, wins: 3, fullGames: 2, screenshotGames: 2, winRatePct: 75, kd: 1.67, kda: 1.9, kdaGames: 4, acs: 225,
  adr: 140, statGames: 4, hsPct: 24.5, firstKills: 8, firstDeaths: 2, firstDeathGames: 2, plants: 1, defuses: 0, agents: [{ characterId: 'not-an-agent', games: 3 }], ...over,
});

const data = (over: Partial<ScrimData> = {}): ScrimData => ({
  teamId: 't1', coverage: coverage(), hasData: true, truncated: false, minMapSample: 5,
  sample: { maps: 6, from: '2026-10-01T12:00:00Z', to: '2026-10-09T12:00:00Z' },
  record: { games: 6, wins: 4, losses: 2, draws: 0, winRatePct: 66.7, winLowPct: 30, winHighPct: 90, roundsWon: 70, roundsLost: 50, roundWinRatePct: 58.3 },
  form: ['W', 'L', 'W'], activity: [{ month: '2026-10', games: 6, wins: 4 }],
  maps: [{ mapId: 'Ascent', map: 'Ascent', games: 2, wins: 1, winRatePct: 50, winLowPct: 9.5, winHighPct: 90.5, roundsWon: 20, roundsLost: 20, roundWinRatePct: 50, attack: { played: 4, won: 2, pct: 50 }, defense: side, lastPlayed: '2026-10-02T00:00:00Z', signal: 'insufficient_sample' }],
  unplayedMaps: ['Split'],
  compositions: [{ agents: ['a', 'b', 'c', 'd', 'e'], games: 4, wins: 3, winRatePct: 75, roundWinRatePct: 60, attack: side, defense: side, maps: [{ map: 'Ascent', games: 2, wins: 2 }], lastPlayed: null }],
  players: [player()],
  roster: {
    lineups: [{ userIds: ['u1'], names: ['Nova'], complete: false, games: 4, wins: 3, winRatePct: 75, roundWinRatePct: 60, lastPlayed: null }],
    stability: { distinctLineups: 1, completeLineups: 0, mostUsedSharePct: null, playersUsed: 1, gamesWithKnownPlayers: 4 },
    substitutes: { gamesWith: 0, winsWith: 0, winRateWithPct: null, gamesWithout: 4, winsWithout: 3, winRateWithoutPct: 75 }, pairs: [],
  },
  recent: [{ sessionId: 's1', gameNumber: 1, playedAt: '2026-10-02T00:00:00Z', map: 'Ascent', opponent: 'Omega', result: 'win', roundsWon: 13, roundsLost: 7, tier: 'full' }],
  ...over,
});

const query = (over: Record<string, unknown> = {}) => ({ isLoading: false, isError: false, data: undefined, refetch: vi.fn(), ...over });
const renderPanel = () => render(<MemoryRouter><ScrimDataPanel teamId="t1" /></MemoryRouter>);

beforeEach(() => mocks.useScrimData.mockReset());

describe('ScrimDataPanel', () => {
  it('shows a loading state', () => {
    mocks.useScrimData.mockReturnValue(query({ isLoading: true }));
    renderPanel();
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
  });

  it('offers a retry when it cannot load', () => {
    const refetch = vi.fn();
    mocks.useScrimData.mockReturnValue(query({ isError: true, refetch }));
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('explains an empty record and what is not counted yet', () => {
    mocks.useScrimData.mockReturnValue(query({ data: data({ hasData: false, sample: { maps: 0, from: null, to: null }, coverage: coverage({ maps: 0, full: 0, screenshot: 0, scoreOnly: 0, awaitingConfirmation: 2 }) }) }));
    renderPanel();
    expect(screen.getByText(/No confirmed scrim maps yet/)).toBeInTheDocument();
    expect(screen.getByText(/2 maps are waiting for the other team to confirm/)).toBeInTheDocument();
    expect(screen.queryByText('Win rate')).toBeNull();
  });

  it('shows what the data is built from, the sample, and every section', () => {
    mocks.useScrimData.mockReturnValue(query({ data: data() }));
    renderPanel();
    expect(screen.getByText(/Based on 6 confirmed scrim maps/)).toBeInTheDocument();
    expect(screen.getByText(/Small sample/)).toBeInTheDocument();
    expect(screen.getByLabelText('What your data is built from')).toHaveTextContent('Auto-fetched from Riot');
    expect(screen.getByText('66.7%')).toBeInTheDocument();
    expect(screen.getByLabelText(/Recent form, newest first: Win, Loss, Win/)).toBeInTheDocument();
    expect(screen.getByLabelText('Map pool')).toHaveTextContent('Ascent');
    expect(screen.getByLabelText('Map pool')).toHaveTextContent('Too few maps');
    expect(screen.getByLabelText('Map pool')).toHaveTextContent('No confirmed maps on: Split');
    expect(screen.getByLabelText('Compositions')).toHaveTextContent('not proof it is better');
    expect(screen.getByLabelText('Players')).toHaveTextContent('Nova');
    expect(screen.getByLabelText('Roster')).toHaveTextContent('Partial');
    expect(screen.getByRole('link', { name: /Ascent/ })).toHaveAttribute('href', '/competitive/scrims/sessions/s1');
  });

  it('says where each player figure comes from, and where it does not exist', () => {
    mocks.useScrimData.mockReturnValue(query({ data: data({ players: [player({ firstDeaths: null, firstDeathGames: 0, kd: null, acs: null, adr: null, hsPct: null })] }) }));
    const { container } = renderPanel();
    expect(screen.getByText('auto-fetched maps only')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|undefined|null/);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(5);
  });

  it('notes figures that come from only some of a player’s maps', () => {
    mocks.useScrimData.mockReturnValue(query({ data: data() }));
    renderPanel();
    expect(screen.getAllByText('from 4 of 4 maps').length).toBeGreaterThan(0);
    expect(screen.getByText('from 2 of 4 maps')).toBeInTheDocument();
  });

  it('warns when only the most recent maps are included', () => {
    mocks.useScrimData.mockReturnValue(query({ data: data({ truncated: true }) }));
    renderPanel();
    expect(screen.getByText(/Only the most recent maps are included/)).toBeInTheDocument();
  });
});
