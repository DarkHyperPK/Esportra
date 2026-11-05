import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SquadUpDeck } from './SquadUpDeck';
import type { SquadUpCard } from '@/schemas/squadUp';

vi.mock('@/hooks/competitive/useLfgReducedMotion', () => ({ useLfgReducedMotion: () => true }));

const card: SquadUpCard = {
  userId: 'u1', username: 'Sage Main', competitiveTier: 15, competitiveTierName: 'Gold 1', matchesAnalyzed: 12,
  winRate: 54.2, kdRatio: 1.12, hsPct: null, micOn: true, slotsNeeded: 2, synergyLabel: 'great_synergy',
  synergyScore: 2, likedYou: true, riotGameName: 'Sage', riotTagLine: 'NA1', popularAgents: '[]',
};

describe('SquadUpDeck', () => {
  it('shows the player, why they were suggested, and handles missing stats', () => {
    render(<SquadUpDeck card={card} onSwipe={vi.fn()} />);
    expect(screen.getByText('Sage Main')).toBeInTheDocument();
    expect(screen.getByText('Great synergy')).toBeInTheDocument();
    expect(screen.getByText('Liked you')).toBeInTheDocument();
    expect(screen.getByText('Sage#NA1')).toBeInTheDocument();
    expect(screen.getByText('54%')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('swipes with the buttons', () => {
    const onSwipe = vi.fn();
    render(<SquadUpDeck card={card} onSwipe={onSwipe} />);
    fireEvent.click(screen.getByRole('button', { name: /pass/i }));
    fireEvent.click(screen.getByRole('button', { name: /let.s squadUp/i }));
    expect(onSwipe).toHaveBeenNthCalledWith(1, card, 'left');
    expect(onSwipe).toHaveBeenNthCalledWith(2, card, 'right');
  });

  it('swipes with the arrow keys and ignores input while busy', () => {
    const onSwipe = vi.fn();
    const { rerender } = render(<SquadUpDeck card={card} onSwipe={onSwipe} />);
    const deck = screen.getByRole('group', { name: /player deck/i });
    fireEvent.keyDown(deck, { key: 'ArrowRight' });
    fireEvent.keyDown(deck, { key: 'ArrowLeft' });
    expect(onSwipe).toHaveBeenCalledTimes(2);
    rerender(<SquadUpDeck card={card} onSwipe={onSwipe} disabled />);
    fireEvent.keyDown(deck, { key: 'ArrowRight' });
    expect(onSwipe).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: /pass/i })).toBeDisabled();
  });
});
