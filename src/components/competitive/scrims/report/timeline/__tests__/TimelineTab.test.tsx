import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScrimTimelineResponse } from '@/schemas/scrimTimeline';
import TimelineTab from '../TimelineTab';

let state: { data?: ScrimTimelineResponse; isLoading?: boolean; isError?: boolean } = {};
vi.mock('@/hooks/competitive/useScrimTimeline', () => ({
  useScrimTimeline: () => ({ data: state.data, isLoading: !!state.isLoading, isError: !!state.isError, refetch: vi.fn() }),
}));
vi.mock('@/hooks/useValorantCatalog', () => ({
  useValorantMaps: () => ({ data: [{ displayName: 'Lotus', mapUrl: '/Game/Maps/Jam/Jam', displayIcon: 'https://x/lotus.png', xMultiplier: 0.0001, yMultiplier: -0.0001, xScalarToAdd: 0.5, yScalarToAdd: 0.5 }] }),
}));

const kill = (ordinal: number, ms: number, killer: string, victim: string) => ({ ordinal, ms, killer, victim, assistants: [], weapon: null, type: 'Weapon', victimX: 100, victimY: 200, positions: [{ key: killer, x: 10, y: 20, facing: null }] });
const round = (num: number, kills = [kill(1, 5000, 'p1', 'p2')]) => ({
  num, won: num === 1, myRole: 'attack' as const, resultCode: null, plantSite: null, plantMs: null, plantX: null, plantY: null, planter: null, defused: false, defuseMs: null, defuseX: null, defuseY: null, defuser: null, kills,
});
const DATA: ScrimTimelineResponse = {
  sessionId: 's', gameNumber: 1, reason: null, map: 'Lotus',
  timeline: { players: [{ key: 'p1', name: 'Alpha', agent: null, mine: true }, { key: 'p2', name: 'Omega', agent: null, mine: false }], rounds: [round(1), round(2, [kill(1, 9000, 'p2', 'p1')])] },
};

describe('TimelineTab', () => {
  beforeEach(() => { state = {}; });

  it('shows the plain reason when there is no timeline, never an empty map', () => {
    state = { data: { ...DATA, timeline: null, reason: 'This map has no verified Riot data.' } };
    render(<TimelineTab sessionId="s" gameNumber={1} />);
    expect(screen.getByText('This map has no verified Riot data.')).toBeInTheDocument();
  });

  it('puts each player on a lane and stages the clicked moment', () => {
    state = { data: DATA };
    render(<TimelineTab sessionId="s" gameNumber={1} />);
    expect(screen.getByRole('status', { name: '' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Alpha kill at 0:05' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Omega death at 0:05' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByRole('button', { name: 'Omega kill at 0:09' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alpha death at 0:09' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('draws this map’s heatmap from the same data', () => {
    state = { data: DATA };
    render(<TimelineTab sessionId="s" gameNumber={1} />);
    expect(screen.getByText('1 kills over 1 map on Lotus.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Defense' }));
    expect(screen.getByText('No kills recorded on Lotus while defending yet.')).toBeInTheDocument();
  });
});
