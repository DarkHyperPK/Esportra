import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

type Tournament = {
  id: string;
  name: string;
  game: string;
  date: string;
  time: string;
  venue: string;
  max_participants: number;
  current_participants: number;
  status: 'upcoming' | 'ongoing' | 'completed';
  team_size: number;
  slug?: string;
};

const OrganizerTournamentsList: React.FC = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTournaments = async () => {
    setLoading(true);
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, game, date, time, venue, max_participants, team_size, slug')
        .eq('organizer_id', user.id)
        .order('start_date', { ascending: true });

      if (error) throw error;

      const mappedTournaments: Tournament[] = Array.isArray(data)
        ? (data as any[]).map((t) => ({
          id: t.id,
          name: t.name,
          game: t.game,
          date: t.date,
          time: t.time,
          venue: t.venue,
          max_participants: t.max_participants,
          current_participants: 0,
          status: 'upcoming',
          team_size: t.team_size ?? 1,
          slug: t.slug,
        }))
        : [];

      setTournaments(mappedTournaments);
    } catch (error: any) {
      console.error('Error fetching tournaments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tournaments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchTournaments();
  }, [user, fetchTournaments]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Tournaments</h1>
          <p className="text-gray-400">Manage your tournaments</p>
        </div>
        <Link to="/organizer/tournaments/new">
          <Button>Create Tournament</Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.map((tournament) => (
          <Link key={tournament.id} to={`/organizer/tournament/${tournament.slug || tournament.id}`}>
            <Card className="hover:border-gaming-purple transition-colors">
              <CardHeader>
                <CardTitle>{tournament.name}</CardTitle>
                <p className="text-gray-400">{tournament.game}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center text-gray-400">
                    <span className="mr-2">📅</span>
                    {new Date(tournament.date).toLocaleDateString()} at {tournament.time}
                  </div>
                  <div className="flex items-center text-gray-400">
                    <span className="mr-2">👥</span>
                    Registered Participants: {tournament.current_participants}
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-gray-400">
                      {tournament.status}
                    </span>
                    <Button variant="outline">Manage</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default OrganizerTournamentsList; 