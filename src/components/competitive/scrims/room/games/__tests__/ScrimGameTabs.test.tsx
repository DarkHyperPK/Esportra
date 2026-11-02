import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ScrimGameTabs } from '../ScrimGameTabs';
import { buildGameTabs } from '@/services/scrimGameTabs';

describe('ScrimGameTabs', () => {
  it('shows one tab per map and locks the ones not reachable yet', () => {
    render(<ScrimGameTabs tabs={buildGameTabs(3, [], false)} active={1} onSelect={vi.fn()} />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: /Game 1/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Game 2/ })).toHaveAttribute('aria-disabled', 'true');
  });

  it('does not open a locked map', () => {
    const onSelect = vi.fn();
    render(<ScrimGameTabs tabs={buildGameTabs(3, [], false)} active={1} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('tab', { name: /Game 3/ }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('opens a reachable map', () => {
    const onSelect = vi.fn();
    const tabs = buildGameTabs(3, [{
      gameNumber: 1, status: 'confirmed', mapName: null, mapId: null, team1Score: 13, team2Score: 7, winnerSlot: 1, source: 'manual',
      riotMatchId: null, matchData: null, screenshotUrls: [], notes: null, reportedByTeamId: 't1', reportedAt: '',
      confirmedByTeamId: null, confirmedAt: null, disputedByTeamId: null, acceptBy: null, autoConfirmed: false,
    }], false);
    render(<ScrimGameTabs tabs={tabs} active={1} onSelect={onSelect} />);
    expect(screen.getByRole('tab', { name: /Game 1.*13–7/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Game 2/ }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });
});
