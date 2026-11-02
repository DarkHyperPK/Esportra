import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScrimGameRow } from '../ScrimGameRow';
import type { ScrimGame } from '@/types/competitive';

const game: ScrimGame = {
  gameNumber: 1, status: 'reported', mapName: 'Haven', mapId: null, team1Score: 13, team2Score: 9, winnerSlot: null,
  source: 'riot', riotMatchId: 'm', matchData: null, screenshotUrls: [], notes: null,
  reportedByTeamId: 't1', reportedAt: '2026-11-03T10:00:00Z', confirmedByTeamId: null, confirmedAt: null, disputedByTeamId: null,
  acceptBy: null, autoConfirmed: false,
};
const team1 = { id: 't1', name: 'Apex' };
const team2 = { id: 't2', name: 'Nova' };

function renderRow(over: Partial<React.ComponentProps<typeof ScrimGameRow>> = {}) {
  const onConfirm = vi.fn();
  const onEdit = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ScrimGameRow sessionId="s" game={game} myTeamId="t2" isStaff team1={team1} team2={team2}
        confirming={false} confirmError={null} onConfirm={onConfirm} onEdit={onEdit} {...over} />
    </QueryClientProvider>,
  );
  return { onConfirm, onEdit };
}

describe('ScrimGameRow', () => {
  it('lets the other team confirm or dispute a reported map', () => {
    const { onConfirm } = renderRow();
    expect(screen.getByText(/Apex reported this map/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm map' }));
    expect(onConfirm).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Dispute' })).toBeInTheDocument();
  });

  it('makes the reporting team wait and offers an edit', () => {
    const { onEdit } = renderRow({ myTeamId: 't1' });
    expect(screen.getByText(/Waiting for the other team/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm map' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Edit result' }));
    expect(onEdit).toHaveBeenCalled();
  });

  it('says other maps can continue while a map is disputed', () => {
    renderRow({ game: { ...game, status: 'disputed' } });
    expect(screen.getByText(/keep playing and reporting the other maps/)).toBeInTheDocument();
  });

  it('tells the team when an unanswered map confirms itself', () => {
    renderRow({ game: { ...game, acceptBy: new Date(Date.now() + 3 * 3600_000).toISOString() } });
    expect(screen.getByText(/confirms automatically in 3 hours/)).toBeInTheDocument();
  });

  it('labels a map that was confirmed automatically', () => {
    renderRow({ game: { ...game, status: 'confirmed', autoConfirmed: true } });
    expect(screen.getByText(/Confirmed automatically/)).toBeInTheDocument();
  });

  it('offers the scoreboard only when the map has match details', () => {
    renderRow({ game: { ...game, matchData: { players: [] } } });
    expect(screen.getByRole('button', { name: 'Show scoreboard' })).toBeInTheDocument();
  });
});
