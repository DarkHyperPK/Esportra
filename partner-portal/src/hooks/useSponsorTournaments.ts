import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface SponsorTournamentLink {
  tournament_id: string;
  title: string;
  slug: string | null;
  status: string | null;
  start_date: string | null;
  tournament_banner: string | null;
  sponsor_type: 'title_sponsor' | 'event_sponsor' | 'media_sponsor';
  placement_zones: string[];
  priority: number;
  is_active: boolean;
  linked_at: string;
}

export const useSponsorTournaments = (sponsorId?: string) => {
  return useQuery<SponsorTournamentLink[]>({
    queryKey: ['sponsor-tournaments', sponsorId],
    queryFn: () =>
      apiClient.get<SponsorTournamentLink[]>(
        `/api/sponsors/${sponsorId}/tournaments`
      ),
    enabled: !!sponsorId,
    staleTime: 60 * 1000,
  });
};
