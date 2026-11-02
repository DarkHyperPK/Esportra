import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TeamRecordStrip } from '../TeamRecordStrip';
import type { ScrimTeamRecord } from '@/types/competitive';

const rec = (over: Partial<ScrimTeamRecord> = {}): ScrimTeamRecord => ({
  wins: 12,
  losses: 4,
  draws: 0,
  completed: 16,
  noShows: 1,
  showRate: 0.94,
  lastPlayedAt: null,
  last5: ['W', 'W', 'L'],
  streak: 2,
  ...over,
});

describe('TeamRecordStrip', () => {
  it('renders nothing for a hidden record', () => {
    const a = render(<TeamRecordStrip record={null} />);
    expect(a.container).toBeEmptyDOMElement();
    const b = render(<TeamRecordStrip record={undefined} />);
    expect(b.container).toBeEmptyDOMElement();
  });

  it('shows record, win rate and show rate', () => {
    render(<TeamRecordStrip record={rec()} />);
    expect(screen.getByText('12-4')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('94%')).toBeInTheDocument();
  });

  it('describes itself to screen readers without relying on colour', () => {
    render(<TeamRecordStrip record={rec()} />);
    const group = screen.getByRole('group');
    expect(group.getAttribute('aria-label')).toMatch(/12 wins, 4 losses/);
    expect(group.getAttribute('aria-label')).toMatch(/oldest to newest: loss, win, win/);
  });

  it('puts the newest result last and letters inside every pip', () => {
    render(<TeamRecordStrip record={rec({ last5: ['W', 'L', 'D'] })} />);
    const letters = screen.getAllByText(/^[WLD]$/).map((n) => n.textContent);
    expect(letters).toEqual(['D', 'L', 'W']);
  });

  it('shows a streak only for runs of two or more', () => {
    const { rerender } = render(<TeamRecordStrip record={rec({ streak: 3 })} />);
    expect(screen.getByText('W3')).toBeInTheDocument();
    rerender(<TeamRecordStrip record={rec({ streak: 1 })} />);
    expect(screen.queryByText(/^W\d$/)).not.toBeInTheDocument();
  });

  it('shows "New to scrims" instead of a fake 0-0', () => {
    render(<TeamRecordStrip record={rec({ wins: 0, losses: 0, completed: 0, noShows: 0, showRate: null, last5: [], streak: 0 })} />);
    expect(screen.getByText(/New to scrims/i)).toBeInTheDocument();
    expect(screen.queryByText('0-0')).not.toBeInTheDocument();
  });
});
