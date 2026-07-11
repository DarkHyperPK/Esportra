import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from '@/lib/apiClient';
import { fetchGameData } from '@/hooks/useRawgGame';
import { formatDate } from '@/utils/dateFormat';

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
        const data = await apiClient.get<any[]>('/api/tournaments/me/history');

        // Process status and filter completed
        const processedTournaments = (data || []).map((t: any) => {
          const dbStatus = String(t.status ?? '').toLowerCase();
          let status: 'upcoming' | 'ongoing' | 'completed';

          if (dbStatus === 'completed' || dbStatus === 'cancelled') {
            status = 'completed';
          } else if (dbStatus === 'ongoing') {
            status = 'ongoing';
          } else {
            status = 'upcoming';
          }

          return {
            ...t,
            status: status as any,
          };
        }).filter((t: any) => t.status !== 'completed');

        setTournaments(processedTournaments);
      } catch (error) {
        console.error('Error fetching tournaments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [user]);

  // Fetch RAWG images for each game via shared cache
  useEffect(() => {
    const fetchImages = async () => {
      const newImages: Record<string, { logo: string | null; banner: string | null }> = {};
      const uniqueGames = Array.from(new Set(tournaments.map(t => t.game)));

      await Promise.all(
        uniqueGames.map(async (game) => {
          const cached = await fetchGameData(game);
          // Map back to all tournaments with this game
          tournaments.filter(t => t.game === game).forEach(t => {
            newImages[t.id] = {
              logo: cached.gameLogo,
              banner: cached.gameBanner,
            };
          });
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
    <Card className="bg-[#0a0a0c] border-white/10/30">
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
              <div key={i} className="animate-pulse bg-zinc-800/20 p-4 rounded-lg">
                <div className="h-6 w-1/3 bg-zinc-800/30 rounded mb-2"></div>
                <div className="h-4 w-1/4 bg-zinc-800/30 rounded"></div>
              </div>
            ))}
          </div>
        ) : tournaments.length > 0 ? (
          <div className="space-y-4">
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="relative bg-zinc-800/10 p-4 rounded-lg border border-white/10/30 hover:border-gaming-purple/50 transition-colors cursor-pointer overflow-hidden"
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
                  <div className="h-12 w-12 rounded bg-esports-dark flex items-center justify-center overflow-hidden border border-white/10/40">
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
                    <p>Date: {formatDate(tournament.date)}</p>
                    <p>Time: {tournament.time}</p>
                    <p>Venue: {tournament.venue}</p>
                  </div>
                  <div className="text-right">
                    <p>Participants: {tournament.current_participants} / {tournament.max_participants}</p>
                    <p className="text-xs mt-1">
                      Registered: {formatDate(tournament.registered_at)}
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

