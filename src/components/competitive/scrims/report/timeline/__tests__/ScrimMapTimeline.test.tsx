import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ScrimMapTimeline from '../ScrimMapTimeline';

let games: { data?: unknown; isLoading: boolean; isError: boolean } = { isLoading: false, isError: false };
const timeline = { data: { timeline: { players: [{ key: 'p1', name: 'Alpha', agent: null, mine: true }], rounds: [] } }, isLoading: false };
const received = vi.hoisted(() => ({ props: undefined as Record<string, unknown> | undefined }));

vi.mock('@/hooks/competitive/useScrimGames', () => ({ useScrimGames: () => ({ ...games, refetch: vi.fn() }) }));
vi.mock('@/hooks/competitive/useScrimTimeline', () => ({ useScrimTimeline: () => timeline }));
vi.mock('@/hooks/useValorantCatalog', () => ({
  useValorantAgents: () => ({ data: {} }),
  useValorantMaps: () => ({ data: [{ displayName: 'Haven', mapUrl: '/Game/Maps/Triad/Triad' }] }),
}));
vi.mock('@/components/debug/RiotTimelineMap', () => ({
  RiotTimelineMap: (props: Record<string, unknown>) => { received.props = props; return <div data-testid="scoreboard-timeline" />; },
}));

const snapshot = {
  matchInfo: { mapId: '/Game/Maps/Triad/Triad' }, teams: [], roundResults: [],
  players: [{ puuid: 'u1', gameName: 'alpha', teamId: 'Red', stats: { score: 0 } }, { puuid: 'u2', gameName: 'Omega', teamId: 'Blue', stats: { score: 0 } }],
};

describe('ScrimMapTimeline', () => {
  beforeEach(() => { received.props = undefined; games = { isLoading: false, isError: false }; });

  it('shows the scoreboard timeline from your team’s side, full width, with the map found by its path', () => {
    games = { isLoading: false, isError: false, data: { games: [{ gameNumber: 1, matchData: { enrichedSnapshot: snapshot } }] } };
    render(<ScrimMapTimeline sessionId="s" gameNumber={1} />);
    expect(screen.getByTestId('scoreboard-timeline')).toBeInTheDocument();
    expect(received.props).toMatchObject({ displayTeamASide: 'Red', targetPuuid: 'u1', fullWidth: true, mapData: { displayName: 'Haven' } });
  });

  it('says so when the map has no stored Riot timeline', () => {
    games = { isLoading: false, isError: false, data: { games: [{ gameNumber: 1, matchData: null }] } };
    render(<ScrimMapTimeline sessionId="s" gameNumber={1} />);
    expect(screen.getByText('This map has no stored Riot timeline.')).toBeInTheDocument();
  });
});
