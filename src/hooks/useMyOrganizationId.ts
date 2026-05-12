import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';

interface MeRoles {
  organization_id?: string | null;
}

export function useMyOrganizationId() {
  const { user } = useAuth();

  const query = useQuery<MeRoles>({
    queryKey: ['me-roles'],
    queryFn: () => apiClient.get<MeRoles>('/api/me/roles'),
    enabled: !!user?.id,
    staleTime: 10 * 60_000,
  });

  return query.data?.organization_id ?? null;
}
