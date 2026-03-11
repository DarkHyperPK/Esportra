import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Badge } from '@/components/ui/badge';
import { Map } from 'lucide-react';

interface MapVetoResultBadgeProps {
  matchId: string;
}

export const MapVetoResultBadge: React.FC<MapVetoResultBadgeProps> = ({ matchId }) => {
  const [selectedMap, setSelectedMap] = useState<string | null>(null);

  useEffect(() => {
    const fetchVetoResult = async () => {
      try {
        const veto = await apiClient.get<{
          selected_map_id: string | null;
          selected_map_name?: string;
          status: string;
        }>(`/api/veto/${matchId}`);

        if (veto?.status === 'completed' && veto.selected_map_name) {
          setSelectedMap(veto.selected_map_name);
        }
      } catch (error) {
        console.error('Error fetching veto result:', error);
      }
    };

    if (matchId) {
      fetchVetoResult();
    }
  }, [matchId]);

  if (!selectedMap) return null;

  return (
    <Badge variant="outline" className="text-xs flex items-center gap-1 border-purple-600/40 text-purple-400">
      <Map className="h-3 w-3" />
      {selectedMap}
    </Badge>
  );
};

