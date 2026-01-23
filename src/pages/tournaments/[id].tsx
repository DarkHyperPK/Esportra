import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, MapPin, Users, Trophy, GamepadIcon, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Tournament } from '@/hooks/useTournaments';
import TournamentRegistration from '@/components/TournamentRegistration';

interface DbTournament {
  id: string;
  name: string;
  game: string;
  date: string;
  time: string;
  venue: string | null;
  max_participants: number;
  prize_pool: string;
  entry_fee: string | null;
  description: string;
  user_id: string;
  is_online: boolean;
  created_at: string;
  updated_at: string;
  status: string;
  image_url: string | null;
  team_size: number;
  tournament_participants: { count: number }[];
}

const TournamentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('tournaments')
          .select('*, tournament_participants(count)')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          const dbTournament = data as DbTournament;
          setTournament({
            ...dbTournament,
            current_participants: dbTournament.tournament_participants?.[0]?.count || 0,
            status: dbTournament.status || 'upcoming',
            team_size: dbTournament.team_size || 1,
            updated_at: dbTournament.updated_at || dbTournament.created_at
          });
        }
      } catch (err: any) {
        console.error('Error fetching tournament:', err);
        setError(err.message);
        toast({
          title: "Error",
          description: "Failed to load tournament details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTournament();
    }
  }, [id, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
            <p className="text-muted-foreground">{error || "Tournament not found"}</p>
            <Button
              onClick={() => navigate('/tournaments')}
              className="mt-4"
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Tournament Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
              >
                ← Back
              </Button>
              <Badge variant={tournament.is_online ? "default" : "secondary"}>
                {tournament.is_online ? 'Online' : 'LAN'}
              </Badge>
              <Badge variant="outline">
                {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
              </Badge>
            </div>
            <h1 className="text-4xl font-bold mb-4">{tournament.name}</h1>
            <div className="flex flex-wrap gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <GamepadIcon className="h-5 w-5" />
                <span>{tournament.game}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>{tournament.date} at {tournament.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <span>{tournament.venue}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span>Registered Participants: {tournament.current_participants}</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                <span>{tournament.prize_pool}</span>
              </div>
            </div>
          </div>

          {/* Tournament Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Tournament Format</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-muted-foreground">{tournament.game}</p>
                  <p className="text-muted-foreground">
                    {tournament.team_size} players per team
                  </p>
                  {tournament.entry_fee && (
                    <p className="text-muted-foreground">
                      Entry Fee: {tournament.entry_fee}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <p className="text-muted-foreground">{tournament.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <p className="text-muted-foreground">{tournament.time}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prize Pool</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold">
                    {tournament.prize_pool}
                  </p>
                  <p className="text-muted-foreground">
                    Entry Fee: {tournament.entry_fee || 'Free'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tournament Description */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>About Tournament</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {tournament.description}
              </p>
            </CardContent>
          </Card>

          {/* Registration Section */}
          <Card>
            <CardHeader>
              <CardTitle>Registration</CardTitle>
            </CardHeader>
            <CardContent>
              <TournamentRegistration
                tournamentId={tournament.id}
                tournamentName={tournament.name}
                game={tournament.game}
                teamSize={tournament.team_size}
              />
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TournamentDetails; 