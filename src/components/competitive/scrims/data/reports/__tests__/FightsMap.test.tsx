import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Fight } from '@/schemas/scrimFights';
import { FightsMap } from '../FightsMap';

const T = { xMultiplier: 0.001, yMultiplier: 0.001, xScalarToAdd: 0, yScalarToAdd: 0 };
const f = (x: number, y: number, won: boolean, extra: Partial<Fight> = {}): Fight => ({ x, y, round: 1, side: 'attack', won, nearestAlly: null, traded: null, ...extra });

describe('FightsMap', () => {
  it('shows the score of every zone that has enough fights and says how the whole map went', () => {
    render(<FightsMap art="https://x/m.png" transform={T} map="Haven" fights={[f(100, 100, true), f(100, 100, true), f(100, 100, false), f(500, 500, false)]} />);
    expect(screen.getByRole('status')).toHaveTextContent('4 fights on Haven: you won 2, lost 2.');
    expect(screen.getByText('2–1')).toBeInTheDocument();
    expect(screen.queryByText('0–1')).toBeNull();
  });

  it('reports spacing at death only when enough deaths had a recorded teammate position', () => {
    const deaths = Array.from({ length: 5 }, (_, i) => f(100 + i, 100, false, { nearestAlly: i < 3 ? 2000 : 500, traded: i === 0 }));
    render(<FightsMap art="https://x/m.png" transform={T} map="Haven" fights={deaths} />);
    expect(screen.getByText(/3 of 5 deaths \(60%\) had no teammate within 15 m\. 2 of those 3 went untraded, against 2 of 2 when a teammate was close\./)).toBeInTheDocument();
  });

  it('says plainly when there are no fights', () => {
    render(<FightsMap art="https://x/m.png" transform={T} map="Haven" fights={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent('No fights recorded on Haven yet.');
  });
});
