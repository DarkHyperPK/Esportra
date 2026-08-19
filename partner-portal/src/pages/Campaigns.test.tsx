import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { refetch, useSponsorTournaments } = vi.hoisted(() => ({ refetch: vi.fn(), useSponsorTournaments: vi.fn() }));
vi.mock('@/hooks/useSponsorTournaments', () => ({ useSponsorTournaments }));
vi.mock('@/hooks/usePlacementAnalytics', () => ({
  usePlacementAnalytics: () => ({ data: [], isLoading: false }),
  useAnalyticsSummary: () => ({ data: null, isLoading: false }),
}));
vi.mock('@/hooks/usePlacementHistory', () => ({
  usePlacementHistory: () => ({ data: [], isLoading: false }),
}));
import Campaigns from './Campaigns';

const placement = {
  id: 'placement-1', tournamentId: null, tournamentName: null, placementZone: 'homepage_ticker', slotNumber: 1,
  bannerUrl: null, logoUrl: 'https://cdn.example/logo.png', headline: 'Headline', ctaText: 'Visit', ctaUrl: 'https://example.com',
  isActive: true, lifecycle: 'live', reviewReason: null, startsAt: null, endsAt: null, createdAt: '2026-07-19T00:00:00Z',
};

describe('Campaigns', () => {
  it('renders placement details', () => {
    useSponsorTournaments.mockReturnValue({ data: [placement], isLoading: false, error: null, refetch });
    render(<Campaigns />);
    expect(screen.getByText('Global')).toBeInTheDocument();
  });

  it('refetches after an error', () => {
    useSponsorTournaments.mockReturnValue({ data: [], isLoading: false, error: new Error('failed'), refetch });
    render(<Campaigns />);
    fireEvent.click(screen.getByRole('button', { name: 'RETRY' }));
    expect(refetch).toHaveBeenCalled();
  });
});
