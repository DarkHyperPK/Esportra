import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

interface ServerRegion {
  id: string;
  city: string;
  country: string;
}

interface RegionGroup {
  continent: string;
  regions: ServerRegion[];
}

const CONTINENT_LABELS: Record<string, string> = {
  EU: 'Europe',
  NA: 'North America',
  SA: 'South America',
  ME: 'Middle East',
  APAC: 'Asia Pacific',
  OCE: 'Oceania',
  AF: 'Africa',
};

export const useServerRegions = (enabled = true) => {
  return useQuery({
    queryKey: ['dathost-regions'],
    queryFn: () => apiClient.get<RegionGroup[]>('/api/dathost/regions'),
    enabled,
    staleTime: 1000 * 60 * 60, // 1 hour — regions rarely change
  });
};

export { CONTINENT_LABELS };
export type { ServerRegion, RegionGroup };
