import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScrimTimelineResponse } from '@/schemas/scrimTimeline';
import TimelineTab from '../TimelineTab';

let state: { data?: ScrimTimelineResponse; isLoading?: boolean } = {};
vi.mock('@/hooks/competitive/useScrimTimeline', () => ({
  useScrimTimeline: () => ({ data: state.data, isLoading: !!state.isLoading, isError: false, refetch: vi.fn() }),
}));
vi.mock('@/hooks/useValorantCatalog', () => ({
  useValorantMaps: () => ({ data: [{ displayName: 'Lotus', mapUrl: '/Game/Maps/Jam/Jam', displayIcon: 'https://x/lotus.png', xMultiplier: 0.0001, yMultiplier: -0.0001, xScalarToAdd: 0.5, yScalarToAdd: 0.5 }] }),
  useValorantAgents: () => ({ data: {} }),
}));
vi.mock('../ScrimMapTimeline', () => ({ default: () => <div data-testid="scoreboard-timeline" /> }));

const kill = { ordinal: 1, ms: 5000, killer: 'p1', victim: 'p2', assistants: [], weapon: null, type: 'Weapon', victimX: 100, victimY: 200, positions: [{ key: 'p1', x: 10, y: 20, facing: null }] };
const DATA: ScrimTimelineResponse = {
  sessionId: 's', gameNumber: 1, reason: null, map: 'Lotus',
  timeline: {
    players: [{ key: 'p1', name: 'Alpha', agent: null, mine: true }, { key: 'p2', name: 'Omega', agent: null, mine: false }],
    rounds: [{ num: 1, won: true, myRole: 'attack', resultCode: null, plantSite: null, plantMs: null, plantX: null, plantY: null, planter: null, defused: false, defuseMs: null, defuseX: null, defuseY: null, defuser: null, kills: [kill] }],
  },
};

describe('TimelineTab', () => {
  beforeEach(() => { state = {}; });

  it('shows the scoreboard timeline for the map', async () => {
    state = { data: DATA };
    render(<TimelineTab sessionId="s" gameNumber={1} />);
    expect(await screen.findByTestId('scoreboard-timeline')).toBeInTheDocument();
  });

  it('draws this map’s heatmap from the same data', async () => {
    state = { data: DATA };
    render(<TimelineTab sessionId="s" gameNumber={1} />);
    expect(await screen.findByText('1 kills over 1 map on Lotus.')).toBeInTheDocument();
  });

  it('shows no heatmap when the map has no timeline data', async () => {
    state = { data: { ...DATA, timeline: null } };
    render(<TimelineTab sessionId="s" gameNumber={1} />);
    expect(await screen.findByTestId('scoreboard-timeline')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Heatmap of this map' })).toBeNull();
  });
});
