import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScrimAutoFetch } from '../ScrimAutoFetch';

const refetch = vi.fn();
let data: unknown;
const hook = vi.fn();

vi.mock('@/hooks/competitive/useScrims', () => ({
  useScrimRecentMatches: (...args: unknown[]) => { hook(...args); return { data, refetch, isFetching: false, isError: false, error: null }; },
}));
vi.mock('@/hooks/competitive/useScrimGames', () => ({
  useReportScrimGameFromRiot: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/components/tournament/RiotMatchCandidateList', () => ({ RiotMatchCandidateList: () => <div>candidates</div> }));

const props = { sessionId: 's1', gameNumber: 1, myTeamId: 't1', team1Id: 't1', team2Id: 't2', onDone: vi.fn() };

describe('ScrimAutoFetch with a map veto', () => {
  beforeEach(() => { hook.mockClear(); refetch.mockClear(); });

  it('asks for the game number and says which map the veto assigned', () => {
    data = { matches: [{ id: 'm' }], reason: null, expectedMap: 'Lotus', hiddenByVeto: 0 };
    render(<ScrimAutoFetch {...props} />);
    expect(hook).toHaveBeenCalledWith('s1', 't1', 1, false);
    expect(screen.getByText(/veto assigned Lotus to game 1, so only Lotus games are listed/i)).toBeInTheDocument();
    expect(screen.queryByText(/show all maps/i)).not.toBeInTheDocument();
  });

  it('offers every map when games on other maps were left out, and refetches with all maps', () => {
    data = { matches: [], reason: null, expectedMap: 'Lotus', hiddenByVeto: 3 };
    render(<ScrimAutoFetch {...props} />);
    expect(screen.getByText(/No recent Lotus games found/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /show all maps \(3 on other maps\)/i }));
    expect(hook).toHaveBeenLastCalledWith('s1', 't1', 1, true);
    expect(refetch).toHaveBeenCalled();
  });

  it('says nothing about a veto when there is none', () => {
    data = { matches: [{ id: 'm' }], reason: null, expectedMap: null, hiddenByVeto: 0 };
    render(<ScrimAutoFetch {...props} />);
    expect(screen.queryByText(/veto assigned/i)).not.toBeInTheDocument();
  });
});
