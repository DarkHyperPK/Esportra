import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface TournamentRegistration {
  id: string;
  tournament_id: string;
  user_id: string;
  registration_type: string;
  team_name: string | null;
  team_captain: string | null;
  team_email: string | null;
  team_phone: string | null;
  team_members: string | null;
  team_logo: string | null;
  created_at: string;
  status: string;
  tournaments: {
    id: string;
    name: string;
    game: string;
    date: string;
    time: string;
    venue: string;
    max_participants: number;
    slug: string;
    image_url: string | null;
    prize_pool: string | null;
    entry_fee: string | null;
    is_online: boolean | null;
    team_size: number | null;
    user_id: string;
  };
}

interface Tournament {
  id: string;
  name: string;
  game: string;
  date: string;
  time: string;
  venue: string;
  max_participants: number;
  current_participants: number;
  status: 'upcoming' | 'ongoing' | 'completed';
  registered_at: string;
  team_size: number;
  prize_pool: string;
  entry_fee: string;
  is_online: boolean;
  image_url: string | undefined;
  slug: string;
  user_id: string;
}

const RAWG_API_KEY = '55e8210bf73448108b7f3c6707739206';
const RAWG_API_URL = 'https://api.rawg.io/api/games';

const PlayerTournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameImages, setGameImages] = useState<Record<string, { logo: string | null; banner: string | null }>>({});
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchTournaments = async () => {
      if (!user) return;

      try {
        // Get all tournaments the user is registered for
        const { data: registrations, error: registrationsError } = await supabase
          .from('tournament_participants')
          .select(`
            id,
            tournament_id,
            user_id,
            registration_type,
            team_name,
            team_captain,
            team_email,
            team_phone,
            team_members,
            team_logo,
            created_at,
            status,
            tournaments (
              id,
              name,
              game,
              date,
              time,
              venue,
              max_participants,
              slug,
              image_url,
              prize_pool,
              entry_fee,
              is_online,
              team_size,
              user_id
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (registrationsError) throw registrationsError;

        // Get participant counts for each tournament
        const validRegistrations = (Array.isArray(registrations) ? registrations : [])
          .filter((reg): reg is NonNullable<typeof reg> => reg != null)
          .filter((reg) => typeof reg === 'object' && 'id' in reg && reg.tournaments && typeof reg.tournaments === 'object' && 'id' in reg.tournaments);
        const tournamentsWithCounts = (await Promise.all(validRegistrations.map(async (reg) => {
          const typedReg = (reg!) as unknown as TournamentRegistration;
          const { count } = await supabase
            .from('tournament_participants')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', typedReg.tournament_id);
          // Determine tournament status based on date
          const tournamentDate = new Date(typedReg.tournaments.date);
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
            ...typedReg.tournaments,
            status,
            current_participants: count || 0,
            registered_at: typedReg.created_at,
            team_size: typedReg.tournaments.team_size ?? 1,
            prize_pool: typedReg.tournaments.prize_pool || '',
            entry_fee: typedReg.tournaments.entry_fee || 'Free',
            is_online: typedReg.tournaments.is_online ?? false,
            image_url: typedReg.tournaments.image_url || undefined,
            slug: typedReg.tournaments.slug || '',
            user_id: typedReg.tournaments.user_id,
          };
        }))).filter((reg): reg is NonNullable<typeof reg> => reg != null);
        // Only show tournaments that are not completed
        const activeTournaments = tournamentsWithCounts.filter(
          (t) => t.status !== 'completed'
        );
        setTournaments(activeTournaments);
      } catch (error) {
        console.error('Error fetching tournaments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [user]);

  // Fetch RAWG images for each game
  useEffect(() => {
    const fetchImages = async () => {
      const newImages: Record<string, { logo: string | null; banner: string | null }> = {};
      await Promise.all(
        tournaments.map(async (tournament) => {
          const searchName = tournament.game.trim().toLowerCase() === 'cs2' ? 'Counter-Strike 2' : tournament.game;
          try {
            const response = await fetch(`${RAWG_API_URL}?key=${RAWG_API_KEY}&search=${encodeURIComponent(searchName)}`);
            const data = await response.json();
            if (data && data.results && data.results.length > 0) {
              const gameData = data.results[0];
              let banner = null;
              // Try to get a screenshot as banner
              try {
                const screenshotsRes = await fetch(`${RAWG_API_URL}/${gameData.id}/screenshots?key=${RAWG_API_KEY}`);
                const screenshotsData = await screenshotsRes.json();
                if (screenshotsData && screenshotsData.results && screenshotsData.results.length > 0) {
                  banner = screenshotsData.results[0].image;
                } else {
                  banner = gameData.background_image_additional || gameData.background_image || null;
                }
              } catch {
                banner = gameData.background_image_additional || gameData.background_image || null;
              }
              newImages[tournament.id] = {
                logo: gameData.background_image || null,
                banner: banner,
              };
            } else {
              newImages[tournament.id] = { logo: null, banner: null };
            }
          } catch {
            newImages[tournament.id] = { logo: null, banner: null };
          }
        })
      );
      setGameImages(newImages);
    };
    if (tournaments.length > 0) fetchImages();
  }, [tournaments]);

  const handleFindTournaments = () => {
    navigate('/tournaments/upcoming');
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
          <div className="flex gap-2">
            <Button
              onClick={handleFindTournaments}
              className="bg-gaming-purple hover:bg-gaming-purple/80"
            >
              Find Tournaments
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/tournament-history')}
              className="border-gaming-purple text-gaming-purple hover:bg-gaming-purple/10"
            >
              Tournament History
            </Button>
          </div>
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
                className="relative bg-gaming-gray/10 p-4 rounded-lg border border-gaming-gray/30 hover:border-gaming-purple/50 transition-colors cursor-pointer overflow-hidden"
                onClick={() => navigate(`/tournaments/${tournament.slug || tournament.id}`)}
              >
                {/* Banner background */}
                {gameImages[tournament.id]?.banner && (
                  <img
                    src={gameImages[tournament.id].banner!}
                    alt={tournament.game + ' banner'}
                    className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm z-0"
                  />
                )}
                <div className="relative z-10 flex items-center gap-3 mb-2">
                  {/* Game logo */}
                  <div className="h-12 w-12 rounded bg-esports-dark flex items-center justify-center overflow-hidden border border-gaming-gray/40">
                    {gameImages[tournament.id]?.logo ? (
                      <img
                        src={gameImages[tournament.id].logo!}
                        alt={tournament.game + ' logo'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">No Logo</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white drop-shadow-md">{tournament.name}</h3>
                    <p className="text-gray-300 text-sm">{tournament.game}</p>
                  </div>
                  <div className="ml-auto">
                    <Badge className={getStatusColor(tournament.status)}>
                      {tournament.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-300 relative z-10">
                  <div>
                    <p>Date: {new Date(tournament.date).toLocaleDateString()}</p>
                    <p>Time: {tournament.time}</p>
                    <p>Venue: {tournament.venue}</p>
                  </div>
                  <div className="text-right">
                    <p>Participants: {tournament.current_participants} / {tournament.max_participants}</p>
                    <p className="text-xs mt-1">
                      Registered: {new Date(tournament.registered_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>You haven't registered for any upcoming or ongoing tournaments.</p>
            <p className="mt-2">
              Check your <Button variant="link" onClick={() => navigate('/tournament-history')}>Tournament History</Button> for past events.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerTournaments;
