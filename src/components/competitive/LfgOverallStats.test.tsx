import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LfgOverallStats } from './LfgOverallStats';
import type { LfgListing } from '@/types/competitive';

describe('overall competitive stats', () => {
  it('shows a coach—s available match totals and partial status', () => {
    render(<LfgOverallStats listing={{ preferredRoles: ['coach'], matchesAnalyzed: 12, winRate: 50, kdRatio: 1.2, winCount: 6, lossCount: 6, statsSyncStatus: 'partial' } as LfgListing} />);
    const stats = within(screen.getByRole('region', { name: 'Overall competitive stats' }));
    expect(stats.getByText('12')).toBeInTheDocument();
    expect(stats.getByText('50%')).toBeInTheDocument();
    expect(stats.getByText('1.20')).toBeInTheDocument();
    expect(stats.getByText('6W / 6L')).toBeInTheDocument();
    expect(stats.queryByText(/partial match history/)).not.toBeInTheDocument();
  });
  it('shows missing stats as unavailable and preserves zero values', () => {
    render(<LfgOverallStats listing={{ matchesAnalyzed: 0, winRate: null, kdRatio: null, winCount: 0, lossCount: 0 } as LfgListing} />);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getByText('0W / 0L')).toBeInTheDocument();
  });
});
