import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

export interface HistoryEntry {
  id: string;
  placementId: string;
  placementZone: string;
  slotNumber: number | null;
  action: string;
  details: string | null;
  createdAt: string;
  sponsorName: string | null;
  tournamentName: string | null;
  performedByName: string | null;
}

export function usePlacementHistory() {
  return useQuery({
    queryKey: ['sponsor', 'placements', 'history'],
    queryFn: () => apiClient.get<HistoryEntry[]>('/api/sponsors/me/placements/history'),
  });
}
