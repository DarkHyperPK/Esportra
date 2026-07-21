import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { PlacementZone } from '@/pages/admin/tools/SponsorAdManager/types';

export interface TournamentSponsorLink {
  id: string;
  sponsor_id: string;
  sponsor_type: 'title_sponsor' | 'event_sponsor' | 'media_sponsor';
  placement_zones: string[];
  media_overrides: Record<string, string> | null;
  priority: number;
  slot_number: number;
  headline: string | null;
  cta_text: string | null;
  cta_url: string | null;
  sponsor: {
    id: string;
    name: string;
    tagline: string | null;
    logo_url: string | null;
    banner_image_url: string | null;
    accent_color: string;
    tier: string;
    cta_text: string | null;
    website_url: string | null;
    gallery_images: string[] | null;
  };
}

export function useTournamentSponsorDisplay(tournamentId?: string) {
  return useQuery({
    queryKey: ['tournament-sponsors', tournamentId],
    queryFn: () =>
      apiClient.get<TournamentSponsorLink[]>(
        `/api/tournaments/${tournamentId}/sponsors`
      ),
    enabled: !!tournamentId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Filter helpers */
export function sponsorsByZone(links: TournamentSponsorLink[], zone: PlacementZone) {
  return links.filter((link) => link.placement_zones?.includes(zone)).sort((left, right) => left.slot_number - right.slot_number);
}

export function titleSponsor(links: TournamentSponsorLink[]) {
  return links.find((l) => l.sponsor_type === 'title_sponsor') ?? null;
}
