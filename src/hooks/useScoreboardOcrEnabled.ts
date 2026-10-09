import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

/** Returns whether the scoreboard OCR feature is currently enabled on the server (admin kill switch). */
export function useScoreboardOcrEnabled() {
  return useQuery({
    queryKey: ['scoreboard-ocr-enabled'],
    queryFn: () => apiClient.get<{ enabled: boolean }>('/api/scoreboard-ocr/enabled'),
    staleTime: 60_000,
  });
}
