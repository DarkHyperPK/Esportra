import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scrimOpponentsSchema } from '@/schemas/scrimOpponents';
import OpponentsTab from '../OpponentsTab';

const mocks = vi.hoisted(() => ({ opponents: vi.fn() }));
vi.mock('@/hooks/competitive/useScrimOpponents', () => ({ useScrimOpponents: mocks.opponents }));

const camel = (v: unknown): unknown => Array.isArray(v) ? v.map(camel)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase()), camel(x)])) : v;
const veto = (n: number) => ({ vetoes: n, unattributed: 0, maps: n ? [{ map: 'Lotus', you_picked: 1, you_banned: 0, they_picked: 0, they_banned: 1, decider: 0, played: 2 }] : [], by_picker: [], your_side_choices: [] });
const opp = (id: string, name: string, vetoes = 0) => ({
  opponent_id: id, name, maps: 3, wins: 2, losses: 1, win_rate_pct: 66.7, rounds_won: 34, rounds_lost: 31, round_win_pct: 52.3, first_played: '2026-10-02T12:00:00Z', last_played: '2026-10-06T12:00:00Z',
  maps_played: [{ map: 'Lotus', games: 2, wins: 2 }, { map: 'Bind', games: 1, wins: 0 }],
  meetings: [{ session_id: 's1', game_number: 1, played_at: '2026-10-06T12:00:00Z', map: 'Lotus', result: 'win', rounds_won: 13, rounds_lost: 11, tier: 'full', agents: ['add6443a-41bd-e414-f6ad-e58d267f4e95'] }],
  veto: veto(vetoes),
});
const data = (list: unknown[]) => scrimOpponentsSchema.parse(camel({ team_id: 't1', has_data: list.length > 0, opponents: list }));
const q = (over: Record<string, unknown> = {}) => ({ isLoading: false, isError: false, data: undefined, refetch: vi.fn(), ...over });
const renderTab = (url = '/x') => render(<MemoryRouter initialEntries={[url]}><OpponentsTab teamId="t1" /></MemoryRouter>);

describe('OpponentsTab', () => {
  beforeEach(() => mocks.opponents.mockReset());

  it('lists partners as teams and shows the first one’s record, meetings and maps, team-level only', () => {
    mocks.opponents.mockReturnValue(q({ data: data([opp('o1', 'Omega'), opp('o2', 'Nova')]) }));
    renderTab();
    expect(screen.getByRole('button', { name: /Omega/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/3 maps against Omega/)).toHaveAttribute('title', expect.stringMatching(/Team-level only/));
    expect(screen.getByRole('region', { name: 'Meetings' })).toHaveTextContent('13–11');
    expect(screen.queryByRole('region', { name: 'Map picks and bans' })).toBeNull();
  });

  it('switches partner and shows the veto read only when there are finished vetoes against them', () => {
    mocks.opponents.mockReturnValue(q({ data: data([opp('o1', 'Omega'), opp('o2', 'Nova', 2)]) }));
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: /Nova/ }));
    expect(screen.getByRole('button', { name: /Nova/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('region', { name: 'Map picks and bans' })).toBeInTheDocument();
    expect(screen.getByText(/3 maps against Nova/)).toBeInTheDocument();
  });

  it('opens the partner named in the URL, explains an empty record, and offers a retry', () => {
    mocks.opponents.mockReturnValue(q({ data: data([opp('o1', 'Omega'), opp('o2', 'Nova')]) }));
    const { unmount } = renderTab('/x?opponent=o2');
    expect(screen.getByRole('button', { name: /Nova/ })).toHaveAttribute('aria-pressed', 'true');
    unmount();
    mocks.opponents.mockReturnValue(q({ data: data([]) }));
    const { unmount: u2 } = renderTab();
    expect(screen.getByText(/No confirmed scrim maps against a known opponent yet/)).toBeInTheDocument();
    u2();
    const refetch = vi.fn();
    mocks.opponents.mockReturnValue(q({ isError: true, refetch }));
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });
});
