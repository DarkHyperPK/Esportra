import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerCareerPanel } from '../PlayerCareerPanel';
import { TeamCareerPanel } from '../TeamCareerPanel';
import type { CareerGame, PlayerCareer, PlayerTotals, TeamCareer, TeamTotals } from '@/types/career';

const mocks = vi.hoisted(() => ({ player: vi.fn(), team: vi.fn() }));
vi.mock('@/hooks/competitive/useCareer', () => ({ usePlayerCareer: mocks.player, useTeamCareer: mocks.team }));

const sample = { matches: 3, rounds: 60, from: '2026-10-01T12:00:00Z', to: '2026-10-03T12:00:00Z' };
const playerTotals: PlayerTotals = {
  matches: 3, scrimMatches: 2, tournamentMatches: 1, wins: 2, losses: 1, draws: 0, winRatePct: 66.7, rounds: 60, kills: 30, deaths: 24, assists: 9,
  kd: 1.25, kda: 1.63, acs: 200, adr: 7.5, headshotSharePct: 50, killsPerRound: 0.5, deathsPerRound: 0.4, assistsPerRound: 0.15,
  firstKills: 3, firstDeaths: 3, multiKills: { k2: 3, k3: 0, k4: 0, k5: 0 }, plants: 0, defuses: 0,
};
const teamTotals: TeamTotals = {
  matches: 12, scrimMatches: 10, tournamentMatches: 2, wins: 7, losses: 5, draws: 0, winRatePct: 58.3, roundsPlayed: 240, roundsWon: 130, roundsLost: 110,
  roundWinRatePct: 54.2, avgRoundsWon: 10.8, avgRoundsLost: 9.2, killsPerRound: 3.4, deathsPerRound: 3.1, damagePerRound: 640, firstKillRatePct: 52, firstDeathRatePct: 48,
};
const game = (over: Partial<CareerGame> = {}): CareerGame => ({
  startedAt: '2026-10-03T12:00:00Z', context: 'scrim', scrimSessionId: 'sess-1', tournamentMatchId: null, gameNumber: 1, map: 'Ascent',
  opponentName: 'Omega', result: 'win', roundsWon: 13, roundsLost: 7, ...over,
});
const query = (over: Record<string, unknown> = {}) => ({ isLoading: false, isError: false, data: undefined, refetch: vi.fn(), ...over });
const pages = (matches: CareerGame[], hasNextPage = false, extra: Record<string, unknown> = {}) =>
  ({ data: { pages: [{ matches }] }, hasNextPage, isFetchingNextPage: false, isError: false, fetchNextPage: vi.fn(), ...extra });

const playerData = (over: Partial<Extract<PlayerCareer, { totals: PlayerTotals }>> = {}): PlayerCareer => ({
  access: 'self', scope: 'all', hasData: true, truncated: false, sample, totals: playerTotals,
  agents: [{ characterId: 'add6443a-41bd-e414-f6ad-e58d267f4e95', matches: 3, wins: 2, winRatePct: 66.7, kd: 1.25, acs: 200 }],
  maps: [{ mapId: '/Game/Maps/Ascent/Ascent', map: 'Ascent', matches: 3, wins: 2, winRatePct: 66.7 }],
  teams: [{ teamId: 't1', teamName: 'Charlie', matches: 1, wins: 1, firstPlayed: '2026-10-03T12:00:00Z', lastPlayed: '2026-10-03T12:00:00Z' }, { teamId: 't2', teamName: 'Alpha', matches: 2, wins: 1, firstPlayed: '2026-10-01T12:00:00Z', lastPlayed: '2026-10-02T12:00:00Z' }],
  activity: [{ month: '2026-10', matches: 3, wins: 2 }], ...over,
});

const renderPlayer = () => render(<MemoryRouter><PlayerCareerPanel userId="u1" /></MemoryRouter>);
const renderTeam = (quiet = false) => render(<MemoryRouter><TeamCareerPanel teamId="t1" quietWhenSignedOut={quiet} /></MemoryRouter>);

beforeEach(() => { mocks.player.mockReset(); mocks.team.mockReset(); });

describe('PlayerCareerPanel', () => {
  it('asks a signed-out visitor to sign in instead of showing an error', () => {
    mocks.player.mockReturnValue({ signedIn: false, summary: query(), games: pages([]) });
    renderPlayer();
    expect(screen.getByText('Sign in to see competitive stats.')).toBeInTheDocument();
  });

  it('shows a loading state, then a retry on failure', () => {
    mocks.player.mockReturnValue({ signedIn: true, summary: query({ isLoading: true }), games: pages([]) });
    const { unmount } = renderPlayer();
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    unmount();

    const refetch = vi.fn();
    mocks.player.mockReturnValue({ signedIn: true, summary: query({ isError: true, refetch }), games: pages([]) });
    renderPlayer();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('says stats are private, without a number, when the viewer has no access', () => {
    mocks.player.mockReturnValue({ signedIn: true, summary: query({ data: { access: 'none' } }), games: pages([]) });
    renderPlayer();
    expect(screen.getByText('This player keeps their performance stats private.')).toBeInTheDocument();
    expect(screen.queryByText(/K\/D/)).toBeNull();
  });

  it('explains how a game becomes verified when there are none', () => {
    mocks.player.mockReturnValue({ signedIn: true, summary: query({ data: playerData({ hasData: false }) }), games: pages([]) });
    renderPlayer();
    expect(screen.getByText(/No verified games yet/)).toBeInTheDocument();
  });

  it('shows the figures with their definitions, the sample line and a small-sample warning', () => {
    mocks.player.mockReturnValue({ signedIn: true, summary: query({ data: playerData() }), games: pages([game(), game({ context: 'tournament', scrimSessionId: null, result: 'loss', roundsWon: 9, roundsLost: 13 })]) });
    renderPlayer();
    expect(screen.getByText(/Based on 3 verified games/)).toBeInTheDocument();
    expect(screen.getByText(/Small sample/)).toBeInTheDocument();
    expect(screen.getByText('1.25')).toBeInTheDocument();
    expect(screen.getByText('Kills ÷ deaths, all rounds')).toBeInTheDocument();
    expect(screen.getByText('66.7%')).toBeInTheDocument();
    expect(screen.getByText(/Not aim accuracy/)).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/competitive/scrims/sessions/sess-1');
  });

  it('never prints NaN, undefined or null for missing figures', () => {
    const empty: PlayerTotals = { ...playerTotals, kd: null, kda: null, acs: null, adr: null, headshotSharePct: null, winRatePct: null, killsPerRound: null, deathsPerRound: null, assistsPerRound: null };
    mocks.player.mockReturnValue({ signedIn: true, summary: query({ data: playerData({ totals: empty }) }), games: pages([]) });
    const { container } = renderPlayer();
    expect(container.textContent).not.toMatch(/NaN|undefined|null/);
    expect(screen.getAllByText('—').length).toBeGreaterThan(3);
  });

  it('loads older games on request', () => {
    const fetchNextPage = vi.fn();
    mocks.player.mockReturnValue({ signedIn: true, summary: query({ data: playerData() }), games: pages([game()], true, { fetchNextPage }) });
    renderPlayer();
    fireEvent.click(screen.getByRole('button', { name: 'Show older games' }));
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('tells the viewer when they are seeing a slice', () => {
    mocks.player.mockReturnValue({ signedIn: true, summary: query({ data: playerData({ access: 'team_staff', scope: 'your_teams' }) }), games: pages([]) });
    renderPlayer();
    expect(screen.getByText('You can see the games this player played for your team.')).toBeInTheDocument();
  });
});

const teamData = (over: Partial<TeamCareer> = {}): TeamCareer => ({
  access: 'member', includesScrims: true, hasData: true, truncated: false, sample: { ...sample, matches: 12 }, totals: teamTotals, form: ['W', 'L', 'W'],
  maps: [], activity: [], players: [{ userId: 'a', username: 'Nova', matches: 9, lastPlayed: '2026-10-03T12:00:00Z' }], ...over,
});

describe('TeamCareerPanel', () => {
  it('shows members the roster appearances and recent form', () => {
    mocks.team.mockReturnValue({ signedIn: true, summary: query({ data: teamData() }), games: pages([game()]) });
    renderTeam();
    expect(screen.getByText('Nova')).toBeInTheDocument();
    expect(screen.getByText('You are seeing every verified game, scrims included.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Recent form, newest first: Win, Loss, Win/)).toBeInTheDocument();
    expect(screen.getByText('54.2%')).toBeInTheDocument();
  });

  it('shows others no names, and says when scrims are private', () => {
    mocks.team.mockReturnValue({ signedIn: true, summary: query({ data: teamData({ access: 'public', includesScrims: false, players: [] }) }), games: pages([]) });
    renderTeam();
    expect(screen.queryByText('Nova')).toBeNull();
    expect(screen.getByText('Tournament games only. This team keeps its scrims private.')).toBeInTheDocument();
  });

  it('stays quiet on a public page for a signed-out visitor', () => {
    mocks.team.mockReturnValue({ signedIn: false, summary: query(), games: pages([]) });
    const { container } = renderTeam(true);
    expect(container).toBeEmptyDOMElement();
  });
});
