import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { RecentMap } from '@/types/scrimData';
import TimelineHome from '../TimelineHome';

vi.mock('@/components/competitive/scrims/report/timeline/TimelineTab', () => ({
  default: ({ sessionId, gameNumber }: { sessionId: string; gameNumber: number }) => <div data-testid="timeline">{`${sessionId}:${gameNumber}`}</div>,
}));

const map = (over: Partial<RecentMap>): RecentMap => ({ sessionId: 's1', gameNumber: 1, playedAt: '2026-10-01T10:00:00Z', map: 'Haven', opponent: 'Omega', result: 'win', roundsWon: 13, roundsLost: 7, tier: 'full', ...over });
const view = (maps: RecentMap[], at = '/x?tab=timeline') => render(<MemoryRouter initialEntries={[at]}><TimelineHome maps={maps} teamId="t1" /></MemoryRouter>);

describe('TimelineHome', () => {
  it('offers only maps with Riot data and opens the newest one', async () => {
    view([map({}), map({ sessionId: 's2', map: 'Lotus', tier: 'score_only' })]);
    expect(await screen.findByTestId('timeline')).toHaveTextContent('s1:1');
    expect(screen.queryByText('Lotus')).toBeNull();
  });

  it('switches maps and honours the map in the address', async () => {
    const maps = [map({}), map({ sessionId: 's3', gameNumber: 2, map: 'Bind' })];
    const { unmount } = view(maps);
    fireEvent.click(screen.getByRole('button', { name: /Bind/ }));
    expect(await screen.findByText('s3:2')).toBeInTheDocument();
    unmount();
    view(maps, '/x?tab=timeline&map=s3:2');
    expect(await screen.findByText('s3:2')).toBeInTheDocument();
  });

  it('says why there is no timeline when no map has Riot data', () => {
    view([map({ tier: 'screenshot' })]);
    expect(screen.getByText(/No verified Riot maps yet/)).toBeInTheDocument();
  });
});
