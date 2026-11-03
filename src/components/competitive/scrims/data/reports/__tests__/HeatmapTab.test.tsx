import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scrimHeatmapSchema } from '@/schemas/scrimHeatmap';
import HeatmapTab from '../HeatmapTab';

const mocks = vi.hoisted(() => ({ heat: vi.fn(), maps: vi.fn() }));
vi.mock('@/hooks/competitive/useScrimReports', () => ({ useScrimHeatmap: mocks.heat }));
vi.mock('@/hooks/useValorantCatalog', () => ({ useValorantMaps: mocks.maps }));
vi.mock('../HeatmapCanvas', () => ({ HeatmapCanvas: ({ label }: { label: string }) => <figure aria-label={label} data-testid="canvas" /> }));

const camel = (v: unknown): unknown => Array.isArray(v) ? v.map(camel)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase()), camel(x)])) : v;
const DATA = {
  team_id: 't1', map: null, kind: 'kills', side: null, maps: 6, truncated: false, available_maps: [{ map: 'Lotus', maps: 4 }, { map: 'Bind', maps: 2 }],
  points: [{ x: 1, y: 2, round: 1, side: 'attack' }, { x: 3, y: 4, round: 2, side: 'defense' }],
};
const q = (over: Record<string, unknown> = {}) => ({ isLoading: false, isError: false, data: scrimHeatmapSchema.parse(camel(DATA)), refetch: vi.fn(), ...over });

describe('HeatmapTab', () => {
  beforeEach(() => { mocks.heat.mockReset(); mocks.maps.mockReset(); });

  it('shows the picture with a plain sentence about what it rests on, and offers maps, events and sides', () => {
    mocks.heat.mockReturnValue(q());
    mocks.maps.mockReturnValue({ data: [{ displayName: 'Lotus', displayIcon: 'https://x/lotus.png', xMultiplier: 1, yMultiplier: 1, xScalarToAdd: 0, yScalarToAdd: 0 }] });
    render(<HeatmapTab teamId="t1" />);
    expect(screen.getByRole('status')).toHaveTextContent('2 kills over 6 maps on Lotus.');
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Map' })).toHaveTextContent('Lotus · 4');
    expect(screen.getByRole('group', { name: 'What to show' })).toHaveTextContent('Opening deaths');
    expect(screen.getByText(/not continuous movement/)).toBeInTheDocument();
  });

  it('asks again with the chosen map, event and side', () => {
    mocks.heat.mockReturnValue(q());
    mocks.maps.mockReturnValue({ data: [] });
    render(<HeatmapTab teamId="t1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Opening kills' }));
    fireEvent.click(screen.getByRole('button', { name: 'Defense' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bind · 2' }));
    expect(mocks.heat).toHaveBeenLastCalledWith('t1', { map: 'Bind', kind: 'opening_kills', side: 'defense' });
  });

  it('draws nothing in a wrong place when the map art is missing, and says so', () => {
    mocks.heat.mockReturnValue(q());
    mocks.maps.mockReturnValue({ data: [] });
    render(<HeatmapTab teamId="t1" />);
    expect(screen.queryByTestId('canvas')).toBeNull();
    expect(screen.getByText(/Map art for Lotus is not available/)).toBeInTheDocument();
  });

  it('explains an empty team and offers a retry on error', () => {
    mocks.maps.mockReturnValue({ data: [] });
    mocks.heat.mockReturnValue(q({ data: scrimHeatmapSchema.parse(camel({ ...DATA, available_maps: [], points: [] })) }));
    const { unmount } = render(<HeatmapTab teamId="t1" />);
    expect(screen.getByText(/Heatmaps appear once auto-fetched maps are confirmed/)).toBeInTheDocument();
    unmount();
    const refetch = vi.fn();
    mocks.heat.mockReturnValue(q({ isError: true, data: undefined, refetch }));
    render(<HeatmapTab teamId="t1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });
});
