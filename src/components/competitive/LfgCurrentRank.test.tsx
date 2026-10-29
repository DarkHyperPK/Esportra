import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LfgCurrentRank } from './LfgCurrentRank';

describe('current player rank', () => {
  it('shows the latest synced rank and matching badge without a peak', () => {
    const { container } = render(<LfgCurrentRank game="valorant" rank={{ competitiveTier: 10, competitiveTierName: 'Silver 2' }} />);
    expect(screen.getByLabelText('Current rank: Silver 2')).toHaveAttribute('title', 'Rank in the latest synced competitive match.');
    expect(container.querySelector('img')).toHaveAttribute('src', expect.stringMatching(/\/ranks\/10\.[a-f0-9]+\.webp$/));
    expect(screen.queryByText(/peak/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Current', { exact: true })).not.toBeInTheDocument();
  });
  it('shows unavailable when no current rank was synced', () => {
    render(<LfgCurrentRank game="valorant" />);
    expect(screen.getByLabelText('Current rank: Unavailable')).toBeInTheDocument();
  });
  it('does not use Valorant badges for other games', () => {
    const { container } = render(<LfgCurrentRank game="cs2" rank={{ competitiveTier: 10, competitiveTierName: 'Example' }} />);
    expect(container.querySelector('img')).toBeNull();
  });
});
