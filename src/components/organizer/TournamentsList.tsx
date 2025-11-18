import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { CheckCircle2 } from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  game: string;
  date: string;
  time: string;
  venue: string;
  max_participants: number;
  description: string;
  entry_fee: string | null;
  prize_pool: string;
  is_online: boolean;
  image_url: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  current_participants?: number;
  isRegistered: boolean;
}

const TournamentsList = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchTournaments = async () => {
      if (!user) return;

      try {
        // Fetch tournaments created by the user
        const { data: tournamentsData, error: tournamentsError } = await supabase
          .from('tournaments')
          .select('*')
          .eq('user_id', user.id)
          .order('start_date', { ascending: true });

        if (tournamentsError) throw tournamentsError;

        // Get participant counts and registration status for each tournament
        const tournamentsWithCounts = await Promise.all((tournamentsData || []).map(async (tournament) => {
          const { count } = await supabase
            .from('tournament_participants')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', tournament.id);

          // Check if user is registered
          let isRegistered = false;
          if (user?.id) {
            const { data: registrationData, error: regError } = await supabase
              .from('tournament_participants')
              .select('id')
              .eq('tournament_id', tournament.id)
              .eq('user_id', user.id)
              .single();
            if (!regError || regError.code === 'PGRST116') {
              isRegistered = !!registrationData;
            }
          }

          // Determine tournament status based on date
          const tournamentDate = new Date(tournament.date);
          const now = new Date();
          let status: 'upcoming' | 'ongoing' | 'completed';
          if (tournamentDate > now) {
            status = 'upcoming';
          } else if (tournamentDate.toDateString() === now.toDateString()) {
            status = 'ongoing';
          } else {
            status = 'completed';
          }

          return {
            ...tournament,
            status,
            current_participants: count || 0,
            isRegistered
          };
        }));

        setTournaments(tournamentsWithCounts);
      } catch (error) {
        console.error('Error fetching tournaments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [user]);

  const handleCreateTournament = () => {
    navigate('/tournaments/create');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-500';
      case 'ongoing':
        return 'bg-green-500';
      case 'completed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card className="bg-gaming-dark border-gaming-gray/30">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>My Tournaments</CardTitle>
          <Button
            onClick={handleCreateTournament}
            className="bg-gaming-purple hover:bg-gaming-purple/80"
          >
            Create Tournament
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse bg-gaming-gray/20 p-4 rounded-lg">
                <div className="h-6 w-1/3 bg-gaming-gray/30 rounded mb-2"></div>
                <div className="h-4 w-1/4 bg-gaming-gray/30 rounded"></div>
              </div>
            ))}
          </div>
        ) : tournaments.length > 0 ? (
          <div className="space-y-4">
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className={`bg-gaming-gray/10 p-4 rounded-lg border border-gaming-gray/30 hover:border-gaming-purple/50 transition-colors cursor-pointer ${tournament.isRegistered ? 'border-gaming-purple' : ''}`}
                onClick={() => navigate(`/tournaments/${tournament.id}`)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold">{tournament.name}</h3>
                    <p className="text-gray-400">{tournament.game}</p>
                  </div>
                  <Badge className={getStatusColor(tournament.status)}>
                    {tournament.status}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <div>
                    <p>Date: {new Date(tournament.date).toLocaleDateString()}</p>
                    <p>Time: {tournament.time}</p>
                    <p>Venue: {tournament.venue}</p>
                  </div>
                  <div className="text-right">
                    <p>Participants: {tournament.current_participants} / {tournament.max_participants}</p>
                    {tournament.isRegistered && (
                      <span className="inline-flex items-center gap-1 text-gaming-green font-semibold ml-2">
                        <CheckCircle2 className="h-4 w-4" /> Registered
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>You haven't created any tournaments yet.</p>
            <p className="mt-2">Click the "Create Tournament" button to get started.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TournamentsList;
