import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface SponsorTournamentLink {
  id: string;
  tournamentId: string | null;
  tournamentName: string | null;
  placementZone: string;
  slotNumber: number | null;
  bannerUrl: string | null;
  logoUrl: string | null;
  headline: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  isActive: boolean;
  lifecycle: 'live' | 'draft' | 'scheduled' | 'inactive' | 'expired' | 'review';
  reviewReason: 'overflow' | 'invalid_scope' | 'unassigned' | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export const useSponsorTournaments = () =>
  useQuery<SponsorTournamentLink[]>({
    queryKey: ['sponsor-placements', 'me'],
    queryFn: async () => {
      try {
        return await apiClient.get<SponsorTournamentLink[]>('/api/sponsors/me/placements');
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) return [];
        throw err;
      }
    },
    staleTime: 60 * 1000,
    retry: (count, err: unknown) => !(err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) && count < 2,
  });
