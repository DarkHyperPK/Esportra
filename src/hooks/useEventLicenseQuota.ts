import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface EventLicenseQuota {
  usedThisMonth: number;
  monthlyLimit: number;
  resetsAt: string;
  isOrganizerPro: boolean;
}

const FAIL_OPEN: EventLicenseQuota = {
  usedThisMonth: 0,
  monthlyLimit: 2,
  resetsAt: '',
  isOrganizerPro: true,
};

/**
 * Fetches the current organizer's event license quota.
 * Cache key: ['event-license-quota'] (user-scoped via auth header).
 * On any error, returns isOrganizerPro=true to fail open — never block on network error.
 */
export function useEventLicenseQuota() {
  const { data, isLoading } = useQuery<EventLicenseQuota>({
    queryKey: ['event-license-quota'],
    queryFn: () => apiClient.get<EventLicenseQuota>('/api/my/event-licenses/quota'),
    staleTime: 60_000,
    gcTime: 120_000,
    // Return fail-open data on error so callers are never blocked
    retry: 1,
  });

  return {
    quota: data ?? FAIL_OPEN,
    isOrganizerPro: data?.isOrganizerPro ?? true,
    isLoading,
  };
}
