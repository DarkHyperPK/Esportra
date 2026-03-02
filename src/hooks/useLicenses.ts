import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

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
    queryFn: async () => {
      const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .eq('user_id', userId!)
        .order('issued_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as License[];
    },
  });
}
