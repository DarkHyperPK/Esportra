import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * useTournamentRegistrationStatus
 * @param tournamentIds Array of tournament IDs to check registration for
 * @returns Object mapping tournamentId to boolean (true if registered)
 */
export function useTournamentRegistrationStatus(tournamentIds: string[]) {
  const { user } = useAuth();
  const [statusMap, setStatusMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id || !tournamentIds.length) {
      setStatusMap({});
      return;
    }
    setLoading(true);
    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from('tournament_participants')
        .select('tournament_id')
        .in('tournament_id', tournamentIds)
        .eq('user_id', user.id);

      if (error) {
        setStatusMap({});
        setLoading(false);
        return;
      }
      const registeredIds = new Set((data || []).map((row: any) => row.tournament_id));
      const map: Record<string, boolean> = {};
      for (const id of tournamentIds) {
        map[id] = registeredIds.has(id);
      }
      setStatusMap(map);
      setLoading(false);
    };
    fetchStatus();
  }, [user?.id, JSON.stringify(tournamentIds)]);

  return { statusMap, loading };
} 