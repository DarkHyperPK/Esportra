import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Tournament } from '@/hooks/useTournaments';
import { supabase } from '@/lib/supabase';

interface Participant {
  id: string;
  user_id: string;
  tournament_id: string;
  created_at: string;
  profiles: {
    username: string;
    full_name: string | null;
  };
}

interface Match {
  id: string;
  tournament_id: string;
  round: number;
  match_number: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  score: string | null;
  status: 'pending' | 'in_progress' | 'completed';
}

const TournamentBrackets = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tournamentId) {
      fetchTournamentData();
    }
  }, [tournamentId]);

  const fetchTournamentData = async () => {
    try {
      setLoading(true);
      
      // Fetch tournament details
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;

      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('tournament_registrations')
        .select(`
          *,
          profiles (
            username,
            full_name
          )
        `)
        .eq('tournament_id', tournamentId);

      if (participantsError) throw participantsError;

      // Fetch matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true })
        .order('match_number', { ascending: true });

      if (matchesError) throw matchesError;

      setTournament(tournamentData);
      setParticipants(participantsData);
      setMatches(matchesData || []);
    } catch (error: any) {
      console.error('Error fetching tournament data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tournament data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-esports-dark text-white">
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/3 bg-gaming-gray/20 rounded"></div>
            <div className="h-64 bg-gaming-gray/20 rounded"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-esports-dark text-white">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Tournament not found</h1>
            <Button
              onClick={() => navigate('/organizer/tournaments')}
              className="bg-gaming-purple hover:bg-gaming-purple/80"
            >
              Back to Tournaments
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-esports-dark text-white">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">{tournament.name}</h1>
              <p className="text-gray-400">{tournament.game}</p>
            </div>
            <Button
              onClick={() => navigate(`/organizer/tournament/${tournamentId}`)}
              variant="outline"
              className="border-gaming-gray/30"
            >
              Back to Tournament
            </Button>
          </div>

          <Card className="bg-gaming-dark border-gaming-gray/30">
            <CardHeader>
              <CardTitle>Tournament Brackets</CardTitle>
            </CardHeader>
            <CardContent>
              {matches.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">No matches have been generated yet.</p>
                  {tournament.status === 'upcoming' && (
                    <Button
                      onClick={() => {/* TODO: Implement bracket generation */}}
                      className="bg-gaming-purple hover:bg-gaming-purple/80"
                    >
                      Generate Brackets
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  {/* TODO: Implement bracket visualization */}
                  <p className="text-gray-400">Bracket visualization coming soon...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TournamentBrackets; 