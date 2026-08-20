import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

export interface SlotStat {
  tournamentId: string | null;
  tournamentName: string | null;
  placementZone: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

export function useSlotAnalytics(days = 30) {
  return useQuery({
    queryKey: ['sponsor', 'analytics', 'slots', days],
    queryFn: async () => {
      try {
        const res = await apiClient.get<{ slots: SlotStat[] }>(`/api/sponsors/me/analytics/slots?days=${days}`);
        return res?.slots ?? [];
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'status' in err) {
          const status = (err as { status: number }).status;
          if (status === 403 || status === 404) return null;
        }
        throw err;
      }
    },
    retry: false,
  });
}
