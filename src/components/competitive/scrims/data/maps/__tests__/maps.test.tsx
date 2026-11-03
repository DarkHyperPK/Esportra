import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MapIntel } from '@/types/scrimData';
import { MapRows } from '../MapRows';
import { MapTierList } from '../MapTierList';

const side = { played: 20, won: 11, pct: 55 };
const map = (name: string, games: number, wins: number, rw: number, rl: number): MapIntel => ({
  mapId: name, map: name, games, wins, winRatePct: Math.round((1000 * wins) / games) / 10, winLowPct: null, winHighPct: null, roundsWon: rw, roundsLost: rl,
  roundWinRatePct: Math.round((1000 * rw) / (rw + rl)) / 10, attack: side, defense: { played: 0, won: 0, pct: null }, lastPlayed: '2026-10-02T00:00:00Z', signal: 'insufficient_sample',
});
const MAPS = [map('Lotus', 4, 3, 52, 28), map('Bind', 3, 1, 30, 50), map('Haven', 1, 1, 13, 5)];
const art = (m: string) => `https://x/${m}.png`;

describe('MapTierList', () => {
  it('places maps in tiers by rounds with the prior, keeps a one-map map in "need more", and uses the map art', () => {
    render(<MapTierList maps={MAPS} artFor={art} />);
    expect(screen.getByRole('list', { name: 'Tier S maps' })).toHaveTextContent('Lotus');
    expect(screen.getByRole('list', { name: 'Tier D maps' })).toHaveTextContent('Bind');
    expect(screen.getByRole('list', { name: 'Maps without enough games' })).toHaveTextContent('Haven');
    expect(screen.getByRole('list', { name: 'Tier S maps' }).querySelector('img')).toHaveAttribute('src', 'https://x/Lotus.png');
    expect(screen.getByRole('heading', { name: 'Map tier list' })).toHaveAttribute('title', expect.stringContaining('half a map'));
  });

  it('shows nothing without maps', () => {
    const { container } = render(<MapTierList maps={[]} artFor={art} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('MapRows', () => {
  it('shows each map on its own picture with record, rounds, sides and how the veto treats it', () => {
    render(<MemoryRouter><MapRows maps={MAPS} artFor={art} picks={[{ map: 'Lotus', youPicked: 3, youBanned: 1, theyPicked: 0, theyBanned: 2, decider: 1, played: 4 }]} /></MemoryRouter>);
    const lotus = screen.getByRole('article', { name: 'Lotus' });
    expect(lotus).toHaveTextContent('3–1');
    expect(lotus).toHaveTextContent('Picked 3');
    expect(lotus).toHaveTextContent('Opponent picked 0 · banned 2');
    expect(lotus.querySelector('img')).toHaveAttribute('src', 'https://x/Lotus.png');
    expect(screen.getByRole('article', { name: 'Bind' })).toHaveTextContent('No veto data');
    expect(lotus).toHaveTextContent('Defense—');
  });
});
