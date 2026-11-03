import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { RecentMap } from '@/types/scrimData';
import MatchHistory from '../MatchHistory';

vi.mock('../../maps/useMapArt', () => ({ useMapArt: () => () => null }));

const m = (sessionId: string, map: string, result: RecentMap['result']): RecentMap =>
  ({ sessionId, gameNumber: 2, playedAt: null, map, opponent: 'Omega', result, roundsWon: 13, roundsLost: 7, tier: 'full' });

describe('MatchHistory', () => {
  it('applies the map filter from the address and links every map to its report', () => {
    render(<MemoryRouter initialEntries={['/x?tab=history&h_map=Haven']}><MatchHistory maps={[m('s1', 'Haven', 'win'), m('s2', 'Lotus', 'loss')]} teamId="t1" /></MemoryRouter>);
    expect(screen.getByRole('status')).toHaveTextContent('1 map · 1–0 · rounds +6');
    const link = screen.getByRole('link', { name: /Haven/ });
    expect(link).toHaveAttribute('href', '/competitive/scrims/sessions/s1/games/2/report?team_id=t1');
    expect(screen.queryByRole('link', { name: /Lotus/ })).toBeNull();
  });

  it('says so when no map matches', () => {
    render(<MemoryRouter initialEntries={['/x?h_res=draw']}><MatchHistory maps={[m('s1', 'Haven', 'win')]} teamId="t1" /></MemoryRouter>);
    expect(screen.getByText('No maps match these filters.')).toBeInTheDocument();
  });
});
