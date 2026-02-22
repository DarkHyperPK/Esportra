import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface CheckinStatus {
  team1CheckedIn: boolean;
  team2CheckedIn: boolean;
  team1CheckinTime: string | null;
  team2CheckinTime: string | null;
  bothCheckedIn: boolean;
}

export const useMatchCheckin = (matchId: string | undefined, team1Id: string | undefined, team2Id: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch check-in status
  const { data: checkins, isLoading } = useQuery({
    queryKey: ['match-checkins', matchId],
    queryFn: async () => {
      if (!matchId) return [];
      const { data, error } = await supabase
        .from('match_checkins')
        .select('*')
        .eq('match_id', matchId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!matchId,
  });

  // Calculate status
  const checkinStatus: CheckinStatus = {
    team1CheckedIn: checkins?.some(c => c.team_id === team1Id) ?? false,
    team2CheckedIn: checkins?.some(c => c.team_id === team2Id) ?? false,
    team1CheckinTime: checkins?.find(c => c.team_id === team1Id)?.checked_in_at ?? null,
    team2CheckinTime: checkins?.find(c => c.team_id === team2Id)?.checked_in_at ?? null,
    bothCheckedIn: false,
  };
  checkinStatus.bothCheckedIn = checkinStatus.team1CheckedIn && checkinStatus.team2CheckedIn;

  // Check in mutation
  const checkIn = useMutation({
    mutationFn: async (teamId: string) => {
      if (!matchId || !user) throw new Error('Missing required data');

      const { error } = await supabase
        .from('match_checkins')
        .insert({
          match_id: matchId,
          team_id: teamId,
          user_id: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-checkins', matchId] });
      toast({ title: 'Checked In!', description: 'You are ready for the match.' });
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast({ title: 'Already Checked In', description: 'Your team has already checked in.' });
      } else {
        toast({ title: 'Check-in Failed', description: error.message, variant: 'destructive' });
      }
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`match-checkins-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_checkins',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['match-checkins', matchId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, queryClient]);

  // Check if check-in window is open (Starts at [Scheduled - Window], Ends at [Scheduled])
  const isCheckinWindowOpen = (scheduledTime: string | null, windowMinutes: number = 15): boolean => {
    if (!scheduledTime) return false;

    const scheduled = new Date(scheduledTime);
    const now = new Date();
    // Window opens X minutes before match
    const windowStart = new Date(scheduled.getTime() - windowMinutes * 60 * 1000);
    // Window closes strictly AT match start time
    const windowEnd = scheduled;

    return now >= windowStart && now < windowEnd;
  };

  // Get time until check-in opens
  const getTimeUntilCheckinOpens = (scheduledTime: string | null, windowMinutes: number = 15): number | null => {
    if (!scheduledTime) return null;

    const scheduled = new Date(scheduledTime);
    const now = new Date();
    const windowStart = new Date(scheduled.getTime() - windowMinutes * 60 * 1000);

    const diff = windowStart.getTime() - now.getTime();
    return diff > 0 ? diff : null;
  };

  // Check if check-in window has closed (past scheduled time)
  const isCheckinWindowClosed = (scheduledTime: string | null, windowMinutes: number = 15): boolean => {
    if (!scheduledTime) return false;

    const scheduled = new Date(scheduledTime);
    const now = new Date();
    // Strict deadline: Match Scheduled Time
    return now >= scheduled;
  };

  // Get time remaining until window closes (for countdown)
  const getTimeUntilWindowCloses = (scheduledTime: string | null, windowMinutes: number = 15): number | null => {
    if (!scheduledTime) return null;

    const scheduled = new Date(scheduledTime);
    const now = new Date();
    // Closes at scheduled time
    const windowEnd = scheduled;

    const diff = windowEnd.getTime() - now.getTime();
    return diff > 0 ? diff : null;
  };

  return {
    checkins,
    checkinStatus,
    isLoading,
    checkIn,
    isCheckinWindowOpen,
    getTimeUntilCheckinOpens,
    isCheckinWindowClosed,
    getTimeUntilWindowCloses,
  };
};
