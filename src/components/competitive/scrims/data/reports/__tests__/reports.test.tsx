import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scrimPlayerReportSchema, scrimTeamReportSchema } from '@/schemas/scrimReport';
import PlayerReportsTab from '../PlayerReportsTab';
import TeamReportTab from '../TeamReportTab';

const rate = (count: number, of: number) => ({ count, of, pct: of ? Math.round((1000 * count) / of) / 10 : null });
const row = (id: string, name: string, acs: number) => ({
  user_id: id, name, maps: 6, rounds: 120, acs, adr: 140, kd: 1.3, kast: 71.2, hs_pct: 24.5, kills: 100, deaths: 77, assists: 30, first_kills: 12, first_deaths: 8,
  multi2: 9, multi3: 2, multi4: 0, multi5: 0, plants: 3, defuses: 1, acs_sd: 21.4, agents: [{ agent: 'add6443a-41bd-e414-f6ad-e58d267f4e95', maps: 6 }],
});
const point = (i: number, map: string, result: string, win: number) => ({
  index: i, date: `2026-10-0${i}T12:00:00Z`, map, opponent: 'Omega', result, rounds_won: 13, rounds_lost: 7, round_win_pct: win, team_acs: 210, team_adr: 140, first_blood_pct: 55, pistol_won: true,
});
const TEAM = {
  team_id: 't1', has_data: true, staff: true, viewer_user_id: 'u1', max_maps: 30,
  report: {
    sample: { maps: 3, from: '2026-10-01T12:00:00Z', to: '2026-10-03T12:00:00Z', capped: false }, wins: 2, losses: 1, win_rate_pct: 66.7, round_win_pct: 58.3,
    series: [point(1, 'Lotus', 'win', 65), point(2, 'Bind', 'loss', 40), point(3, 'Lotus', 'win', 62)],
    maps: [{ map: 'Lotus', games: 2, wins: 2, rounds_won: 26, rounds_lost: 14, round_win_pct: 65, attack: rate(10, 18), defense: rate(16, 22) }],
    attack: rate(20, 40), defense: rate(30, 40), first_blood_rounds: rate(22, 40), win_after_first_blood: rate(18, 22), win_after_first_death: rate(6, 18), pistol: rate(4, 6),
    buys: [{ buy: 'full', rounds_won: rate(14, 20) }], players: [row('u1', 'Nova', 240), row('u2', 'Ray', 180)],
    highlights: [{ kind: 'best_map', tone: 'good', title: 'Best map: Lotus', detail: '2–0 over 2 maps.', player_id: null }],
  },
};
const PLAYER = {
  team_id: 't1', user_id: 'u2', has_data: true, reason: null,
  report: {
    sample: TEAM.report.sample, summary: row('u2', 'Ray', 180),
    series: [1, 2, 3].map((i) => ({ index: i, date: `2026-10-0${i}T12:00:00Z`, map: 'Lotus', agent: 'add6443a-41bd-e414-f6ad-e58d267f4e95', result: 'win', rounds: 20, acs: 180 + i, adr: 140, kills: 18, deaths: 12, assists: 4, kd: 1.5, kast: 70, hs_pct: 22, first_kills: 2, first_deaths: 1 })),
    by_map: [{ key: 'Lotus', maps: 3, wins: 3, win_rate_pct: 100, acs: 181, kd: 1.5, rounds: 60 }], by_agent: [{ key: 'add6443a-41bd-e414-f6ad-e58d267f4e95', maps: 3, wins: 3, win_rate_pct: 100, acs: 181, kd: 1.5, rounds: 60 }],
    hits: { head: 20, body: 60, leg: 20, head_pct: 20, body_pct: 60, leg_pct: 20 }, comparison: { team_acs: 210, acs_vs_team: -30, last5_acs: null, previous5_acs: null, acs_change: null },
    highlights: [{ kind: 'consistency', tone: 'good', title: 'Consistent from map to map', detail: 'ACS varies by about 4 between maps.', player_id: 'u2' }],
  },
};

const camel = (v: unknown): unknown => Array.isArray(v) ? v.map(camel)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase()), camel(x)])) : v;
const teamData = (over: Record<string, unknown> = {}) => scrimTeamReportSchema.parse(camel({ ...TEAM, ...over }));

const mocks = vi.hoisted(() => ({ team: vi.fn(), player: vi.fn() }));
vi.mock('@/hooks/competitive/useScrimReports', () => ({ useScrimTeamReport: mocks.team, useScrimPlayerReport: mocks.player }));
vi.mock('../TrendChart', () => ({ default: () => <div data-testid="trend" /> }));

const q = (over: Record<string, unknown> = {}) => ({ isLoading: false, isError: false, data: undefined, refetch: vi.fn(), ...over });

describe('TeamReportTab', () => {
  beforeEach(() => { mocks.team.mockReset(); mocks.player.mockReset(); });

  it('shows the figures, the highlights and the charts, each with its sample and a text equivalent', () => {
    mocks.team.mockReturnValue(q({ data: teamData() }));
    render(<TeamReportTab teamId="t1" />);
    expect(screen.getByText(/Based on the last 3 verified maps/)).toBeInTheDocument();
    expect(screen.getByText(/small sample/)).toBeInTheDocument();
    expect(screen.getByLabelText('Highlights')).toHaveTextContent('Best map: Lotus');
    expect(screen.getAllByTestId('trend').length).toBe(2);
    for (const t of ['Results by map', 'Attack and defense', 'Opening duels', 'Rounds won by buy', 'Players by ACS']) expect(screen.getByRole('region', { name: t })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Attack and defense' })).toHaveTextContent('20 of 40 · 50%');
    expect(screen.getByRole('heading', { name: 'Round win rate by map' }).closest('section')?.querySelector('table.sr-only')).not.toBeNull();
  });

  it('draws no line chart for fewer than three maps and says when there is nothing yet', () => {
    mocks.team.mockReturnValue(q({ data: teamData({ report: { ...TEAM.report, series: TEAM.report.series.slice(0, 2) } }) }));
    render(<TeamReportTab teamId="t1" />);
    expect(screen.queryByTestId('trend')).toBeNull();
  });

  it('explains an empty team and offers a retry on error', () => {
    mocks.team.mockReturnValue(q({ data: teamData({ has_data: false }) }));
    const { unmount } = render(<TeamReportTab teamId="t1" />);
    expect(screen.getByText(/No verified Riot maps yet/)).toBeInTheDocument();
    unmount();
    const refetch = vi.fn();
    mocks.team.mockReturnValue(q({ isError: true, refetch }));
    render(<TeamReportTab teamId="t1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe('PlayerReportsTab', () => {
  beforeEach(() => { mocks.team.mockReset(); mocks.player.mockReset(); });
  const renderTab = (url = '/x') => render(<MemoryRouter initialEntries={[url]}><PlayerReportsTab teamId="t1" /></MemoryRouter>);

  it('lets staff pick any player and shows that player’s report with highlights and comparison', () => {
    mocks.team.mockReturnValue(q({ data: teamData() }));
    mocks.player.mockReturnValue(q({ data: scrimPlayerReportSchema.parse(camel(PLAYER)) }));
    renderTab('/x?player=u2');
    expect(screen.getByRole('button', { name: /Ray/ })).toHaveAttribute('aria-pressed', 'true');
    expect(mocks.player).toHaveBeenLastCalledWith('t1', 'u2');
    expect(screen.getByText(/30 below the team average \(210\)/)).toBeInTheDocument();
    expect(screen.getByLabelText('Highlights')).toHaveTextContent('Consistent from map to map');
    expect(screen.getByRole('region', { name: 'Where shots land' })).toHaveTextContent('Head 20.0%');
    fireEvent.click(screen.getByRole('button', { name: /Nova/ }));
    expect(mocks.player).toHaveBeenLastCalledWith('t1', 'u1');
  });

  it('shows a member only themselves, with a note that staff see everyone', () => {
    mocks.team.mockReturnValue(q({ data: teamData({ staff: false, viewer_user_id: 'u2', report: { ...TEAM.report, players: [row('u2', 'Ray', 180)] } }) }));
    mocks.player.mockReturnValue(q({ data: scrimPlayerReportSchema.parse(camel(PLAYER)) }));
    renderTab();
    expect(screen.queryByRole('navigation', { name: 'Choose a player' })).toBeNull();
    expect(screen.getByText(/Captains, managers and coaches can open every player/)).toBeInTheDocument();
    expect(mocks.player).toHaveBeenLastCalledWith('t1', 'u2');
  });

  it('says why a player has no report', () => {
    mocks.team.mockReturnValue(q({ data: teamData() }));
    mocks.player.mockReturnValue(q({ data: scrimPlayerReportSchema.parse(camel({ team_id: 't1', user_id: 'u1', has_data: false, reason: 'This player has no verified Riot maps with this team yet.', report: null })) }));
    renderTab();
    expect(screen.getByText(/no verified Riot maps with this team yet/)).toBeInTheDocument();
  });
});
