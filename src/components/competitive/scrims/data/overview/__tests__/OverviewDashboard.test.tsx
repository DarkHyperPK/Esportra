import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OverviewDashboard from '../OverviewDashboard';

const mocks = vi.hoisted(() => ({ report: vi.fn() }));
vi.mock('@/hooks/competitive/useScrimReports', () => ({ useScrimTeamReport: mocks.report }));
vi.mock('@/hooks/competitive/useScrimUpNext', () => ({ useScrimUpNext: () => ({ data: { items: [], total: 0 } }) }));
vi.mock('@/hooks/useValorantCatalog', () => ({ useValorantAgents: () => ({ data: {} }) }));
vi.mock('../../maps/useMapArt', () => ({ useMapArt: () => () => null }));

const rate = (count: number, of: number) => ({ count, of, pct: of ? (100 * count) / of : null });
const player = (userId: string, name: string, maps: number) => ({
  userId, name, maps, rounds: maps * 20, acs: 230, adr: 150, kd: 1.1, kast: 72, hsPct: 25, kills: 0, deaths: 0, assists: 0, firstKills: 0, firstDeaths: 0,
  multi2: 0, multi3: 0, multi4: 0, multi5: 0, plants: 0, defuses: 0, acsSd: null, agents: [{ agent: 'add6443a-41bd-e414-f6ad-e58d267f4e95', maps }],
});
const point = (index: number, result: string) => ({ index, date: null, map: index % 2 ? 'Haven' : 'Lotus', opponent: 'Omega', result, roundsWon: 13, roundsLost: 9, roundWinPct: 59, teamAcs: 220, teamAdr: 140, firstBloodPct: 50, pistolWon: null });
const parts = [{ key: 'round_win', label: 'Round win %', value: 55, score: 75, weight: 0.4 }];
const report = {
  sample: { maps: 3, from: null, to: null, capped: false }, wins: 2, losses: 1, winRatePct: 66.7, roundWinPct: 55, series: [point(1, 'win'), point(2, 'loss'), point(3, 'win')], maps: [],
  attack: rate(1, 2), defense: rate(1, 2), firstBloodRounds: rate(1, 2), winAfterFirstBlood: rate(1, 2), winAfterFirstDeath: rate(1, 2), pistol: rate(1, 2), buys: [],
  players: [player('u1', 'Alpha', 3), player('u2', 'Bravo', 2)], coach: {}, highlights: [{ kind: 'k', tone: 'watch', title: 'Attack is the weak side', detail: '4 of 12 rounds', playerId: null }],
};
const ratings = {
  team: { value: 61.4, change: 3.2, parts }, players: [{ userId: 'u1', rating: { value: 70, change: null, parts } }, { userId: 'u2', rating: { value: null, change: null, parts: [] } }],
  byMap: [{ index: 1, value: 60 }, { index: 2, value: 40 }, { index: 3, value: 80 }],
};
const team = { name: 'Nova', logoUrl: null, tag: 'NVA' };
const view = () => render(<MemoryRouter initialEntries={['/x?team_id=t1']}><OverviewDashboard teamId="t1" team={team} recent={[{ sessionId: 's9', gameNumber: 1, playedAt: null, map: 'Haven', opponent: 'Omega', result: 'win', roundsWon: 13, roundsLost: 5, tier: 'full' }]} fallback={<p>plain overview</p>} /></MemoryRouter>);

describe('OverviewDashboard', () => {
  beforeEach(() => mocks.report.mockReset());

  it('shows the team, its rating with the change and how it is built, the roster and the map-by-map bars', () => {
    mocks.report.mockReturnValue({ isLoading: false, isError: false, data: { hasData: true, report, ratings } });
    view();
    expect(screen.getByRole('heading', { name: 'Nova' })).toBeInTheDocument();
    const rating = screen.getByLabelText('Esportra rating 61');
    expect(rating).toHaveTextContent('▲ 3.2');
    expect(rating).toHaveAttribute('title', expect.stringContaining('Round win %: 55 → 75 (40%)'));
    expect(screen.getByRole('link', { name: /Alpha/ })).toHaveAttribute('href', expect.stringContaining('tab=player-reports&player=u1'));
    expect(screen.getByRole('link', { name: /Bravo/ })).toHaveTextContent('3 maps needed');
    const bars = screen.getByRole('region', { name: 'Map by map' });
    expect(bars).not.toHaveTextContent('Average');
    const rows = within(bars).getAllByRole('listitem');
    expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual([
      'Haven against Omega: won 13–9, rating 80', 'Lotus against Omega: lost 13–9, rating 40', 'Haven against Omega: won 13–9, rating 60',
    ]);
    expect(screen.getByRole('link', { name: /Last scrim: Haven vs Omega/ })).toHaveAttribute('href', '/competitive/scrims/sessions/s9/games/1/report?team_id=t1');
    expect(screen.getByRole('region', { name: 'Focus' })).toHaveTextContent('Attack is the weak side');
  });

  it('falls back to the plain overview when the team has no Riot-verified maps', () => {
    mocks.report.mockReturnValue({ isLoading: false, isError: false, data: { hasData: false, report, ratings } });
    view();
    expect(screen.getByText('plain overview')).toBeInTheDocument();
  });
});
