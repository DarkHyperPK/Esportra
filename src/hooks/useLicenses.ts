import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface License {
  id: string;
  license_id: string;
  license_type: 'venue_owner' | 'organizer' | 'broadcaster';
  status: 'active' | 'suspended' | 'revoked';
  issued_at: string;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
}

export function useLicenses(userId: string | undefined) {
  return useQuery({
    queryKey: ['licenses', userId],
    enabled: !!userId,
    queryFn: () => apiClient.get<License[]>(`/api/profiles/${userId}/licenses`),
  });
}
