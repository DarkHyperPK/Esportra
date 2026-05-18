import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMeRoles, getOrganizationId, meRolesQueryKey } from '@/lib/meRoles';

export function useMyOrganizationId() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: meRolesQueryKey,
    queryFn: fetchMeRoles,
    enabled: !!user?.id,
    staleTime: 10 * 60_000,
  });

  return getOrganizationId(query.data);
}
