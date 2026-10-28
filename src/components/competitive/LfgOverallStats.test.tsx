import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LfgOverallStats } from './LfgOverallStats';
import type { LfgListing } from '@/types/competitive';

describe('overall competitive stats', () => {
  it('shows coach WR, KD and HS without match totals or record', () => {
    render(<LfgOverallStats listing={{ preferredRoles: ['coach'], matchesAnalyzed: 12, winRate: 50, kdRatio: 1.2, hsPct: 25, winCount: 6, lossCount: 6, statsSyncStatus: 'partial' } as LfgListing} />);
    const stats = within(screen.getByRole('region', { name: 'Overall competitive stats' }));
    expect(stats.getByText('50%')).toBeInTheDocument();
    expect(stats.getByText('1.20')).toBeInTheDocument();
    expect(stats.getByText('25%')).toBeInTheDocument();
    expect(stats.queryByText('Matches')).not.toBeInTheDocument();
    expect(stats.queryByText('Record')).not.toBeInTheDocument();
    expect(stats.queryByText(/partial match history/)).not.toBeInTheDocument();
  });
  it('shows missing stats as unavailable and preserves a zero headshot percentage', () => {
    render(<LfgOverallStats listing={{ winRate: null, kdRatio: null, hsPct: 0 } as LfgListing} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2);
  });
});
