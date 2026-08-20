import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { PlacementZone } from '@/pages/admin/tools/SponsorAdManager/types';

export interface GlobalPlacement {
  id: string;
  sponsorId: string;
  placementZone: PlacementZone;
  slotNumber: number;
  bannerUrl: string | null;
  logoUrl: string | null;
  headline: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  priority: number;
  sponsorName: string;
  sponsorTier: string | null;
  sponsorLogoUrl: string | null;
  sponsorBannerUrl: string | null;
  sponsorWebsiteUrl: string | null;
}

export function useGlobalPlacements(zone: 'homepage_ticker' | 'partner_showcase') {
  return useQuery({
    queryKey: ['global-placements', zone],
    queryFn: () => apiClient.get<GlobalPlacement[]>(`/api/placements/global?zone=${zone}`),
    staleTime: 60 * 1000,
  });
}
