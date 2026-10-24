import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { AvailabilityRule } from '@/types/competitive';

const AVAILABILITY_KEY = ['competitive', 'availability'] as const;

export function useAvailability() {
  return useQuery({
    queryKey: AVAILABILITY_KEY,
    queryFn: () => apiClient.get<AvailabilityRule[]>('/api/competitive/availability'),
    staleTime: 60_000,
  });
}

interface CreateAvailabilityRuleRequest {
  timezone: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

export function useCreateAvailabilityRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateAvailabilityRuleRequest) =>
      apiClient.post<AvailabilityRule>('/api/competitive/availability/rules', req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AVAILABILITY_KEY });
    },
  });
}

export function useDeleteAvailabilityRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/competitive/availability/rules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AVAILABILITY_KEY });
    },
  });
}
