import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scrimTrendsSchema } from '@/schemas/scrimTrends';
import TrendsTab from '../TrendsTab';

const mocks = vi.hoisted(() => ({ trends: vi.fn() }));
vi.mock('@/hooks/competitive/useScrimReports', () => ({ useScrimTrends: mocks.trends }));
vi.mock('../TrendChart', () => ({ default: () => <div data-testid="trend" /> }));

const camel = (v: unknown): unknown => Array.isArray(v) ? v.map(camel)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase()), camel(x)])) : v;
const point = (i: number) => ({ index: i, date: `2026-10-0${i}T12:00:00Z`, map: 'Lotus', result: 'win', round_win_pct: 50 + i, team_acs: 200, first_kill_pct: 55, traded_pct: 40, rolling_round_win_pct: i >= 3 ? 52 : null, rolling_acs: null });
const DATA = {
  team_id: 't1', has_data: true, max_maps: 30,
  trends: {
    sample: { maps: 4, from: '2026-10-01T12:00:00Z', to: '2026-10-04T12:00:00Z', capped: false }, series: [1, 2, 3, 4].map(point),
    windows: [
      { label: 'Last 5 maps against the 5 before', enough: true, current_maps: 5, previous_maps: 5, metrics: [
        { key: 'round_win', label: 'Round win rate (%)', current: 65, previous: 35, change: 30, verdict: 'up' }, { key: 'acs', label: 'Team ACS', current: 200, previous: 198, change: 2, verdict: 'flat' },
        { key: 'traded', label: 'Deaths avenged within 5 s (%)', current: 30, previous: 45, change: -15, verdict: 'down' }] },
      { label: 'Last 10 maps against the 10 before', enough: false, current_maps: 10, previous_maps: 2, metrics: [] },
    ],
  },
};
const q = (over: Record<string, unknown> = {}) => ({ isLoading: false, isError: false, data: undefined, refetch: vi.fn(), ...over });

describe('TrendsTab', () => {
  beforeEach(() => mocks.trends.mockReset());

  it('sets the latest maps against the ones before, in words, with the change and the sample', () => {
    mocks.trends.mockReturnValue(q({ data: scrimTrendsSchema.parse(camel(DATA)) }));
    render(<TrendsTab teamId="t1" />);
    expect(screen.getByText(/^4 maps · /)).toBeInTheDocument();
    const win = screen.getByRole('region', { name: 'Last 5 maps against the 5 before' });
    expect(win).toHaveTextContent('35 → 65');
    expect(win).toHaveTextContent('Up · +30');
    expect(win).toHaveTextContent('No clear change');
    expect(win).toHaveTextContent('Down · -15');
  });

  it('says plainly when a comparison has too few maps, and draws the charts with a text alternative', () => {
    mocks.trends.mockReturnValue(q({ data: scrimTrendsSchema.parse(camel(DATA)) }));
    render(<TrendsTab teamId="t1" />);
    expect(screen.getByRole('region', { name: 'Last 10 maps against the 10 before' })).toHaveTextContent('Not enough maps yet (10 and 2)');
    expect(screen.getAllByTestId('trend')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Opening and trading' }).closest('section')?.querySelector('table.sr-only')).not.toBeNull();
  });

  it('explains an empty team and offers a retry on error', () => {
    mocks.trends.mockReturnValue(q({ data: scrimTrendsSchema.parse(camel({ ...DATA, has_data: false })) }));
    const { unmount } = render(<TrendsTab teamId="t1" />);
    expect(screen.getByText(/Trends appear once auto-fetched maps are confirmed/)).toBeInTheDocument();
    unmount();
    const refetch = vi.fn();
    mocks.trends.mockReturnValue(q({ isError: true, refetch }));
    render(<TrendsTab teamId="t1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });
});
