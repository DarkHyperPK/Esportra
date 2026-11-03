import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActivityBars } from '../ActivityBars';

describe('ActivityBars', () => {
  it('renders nothing without activity', () => {
    const { container } = render(<ActivityBars activity={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('labels every bar with its numbers and shows only the last twelve months', () => {
    const activity = Array.from({ length: 14 }, (_, i) => ({ month: `2026-${String((i % 12) + 1).padStart(2, '0')}`, games: i + 1, wins: 1 }));
    render(<ActivityBars activity={activity} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(12);
    expect(screen.getByLabelText('Mar 26: 3 games, 1 won')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Jan 26: 1 game,/)).toBeNull();
  });

  it('uses the singular for one game', () => {
    render(<ActivityBars activity={[{ month: '2026-10', games: 1, wins: 0 }]} />);
    expect(screen.getByLabelText('Oct 26: 1 game, 0 won')).toBeInTheDocument();
  });
});
