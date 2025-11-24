import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
        const { data: veto, error } = await supabase
          .from('valorant_match_map_vetos')
          .select('selected_map_id')
          .eq('match_id', matchId)
          .eq('status', 'completed')
          .maybeSingle();

        if (error) throw error;
        if (veto && veto.selected_map_id) {
          // Fetch map name
          const { data: mapData, error: mapError } = await supabase
            .from('game_maps')
            .select('map_name')
            .eq('id', veto.selected_map_id)
            .single();

          if (!mapError && mapData) {
            setSelectedMap(mapData.map_name);
          }
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

