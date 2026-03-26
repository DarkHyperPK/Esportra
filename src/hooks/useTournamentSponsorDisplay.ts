import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface TournamentSponsorLink {
  id: string;
  sponsor_id: string;
  sponsor_type: 'title_sponsor' | 'event_sponsor' | 'media_sponsor';
  placement_zones: string[];
  media_overrides: Record<string, string> | null;
  priority: number;
  sponsor: {
    id: string;
    name: string;
    tagline: string | null;
    logo_url: string | null;
    banner_image_url: string | null;
    accent_color: string;
    tier: string;
    cta_text: string;
    website_url: string;
    gallery_images: string[];
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
export function sponsorsByZone(links: TournamentSponsorLink[], zone: string) {
  return links.filter((l) => l.placement_zones.includes(zone));
}

export function titleSponsor(links: TournamentSponsorLink[]) {
  return links.find((l) => l.sponsor_type === 'title_sponsor') ?? null;
}
