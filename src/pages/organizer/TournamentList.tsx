import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { Tournament } from '@/hooks/useTournaments';
import { mapTournamentCardBadge } from '@/types/tournament';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { TournamentCard } from '@/components/TournamentCard';

const TournamentList = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchTournaments();
    }
  }, [user]);

  const fetchTournaments = async () => {
    try {
      setLoading(true);

      const orgData = await apiClient.get<any>(`/api/organizations/me`).catch(() => null);

      if (!orgData) {
        setTournaments([]);
        setLoading(false);
        return;
      }

      const data = await apiClient.get<any[]>(`/api/organizations/${orgData.id}/tournaments`);

      // Transform the data to include status and set current_participants to 0
      const tournamentsWithCounts = (data || []).map((tournament) => {
        const dbStatus = String(tournament.status ?? '').toLowerCase();
        let status: 'upcoming' | 'ongoing' | 'completed';

        if (dbStatus === 'completed' || dbStatus === 'cancelled') {
          status = 'completed';
        } else if (dbStatus === 'ongoing') {
          status = 'ongoing';
        } else {
          status = 'upcoming';
        }

        return {
          ...tournament,
          image_url: tournament.banner_url ?? tournament.logo_url ?? null,
          current_participants: 0,
          status,
          team_size: tournament.team_size ?? 1,
          card_badge: mapTournamentCardBadge(tournament),
        };
      });

      setTournaments(tournamentsWithCounts);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTournaments = tournaments.filter(tournament =>
    tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tournament.game.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateTournament = () => {
    navigate('/tournaments/create');
  };

  return (
    <div className="min-h-screen bg-transparent text-white">
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Tournaments</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                className="pl-10 bg-zinc-800/10 border-white/10/30"
                placeholder="Search tournaments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              onClick={() => navigate('/tournaments/create')}
              className="bg-rose-600 hover:bg-rose-600/80"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Tournament
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-zinc-800/20 h-64 rounded-lg" />
            ))}
          </div>
        ) : filteredTournaments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No tournaments found</p>
            <Button
              onClick={handleCreateTournament}
              className="bg-rose-600 hover:bg-rose-600/80"
            >
              Create Your First Tournament
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                id={tournament.id}
                name={tournament.name}
                game={tournament.game}
                date={tournament.date}
                time={tournament.time}
                venue={tournament.venue}
                max_participants={tournament.max_participants}
                current_participants={tournament.current_participants}
                status={tournament.status as 'draft' | 'published' | 'open' | 'closed' | 'ongoing' | 'completed' | 'cancelled'}
                team_size={tournament.team_size}
                prize_pool={tournament.prize_pool}
                organizer_id={tournament.organizer_id}
                entry_fee={tournament.entry_fee}
                is_online={tournament.is_online}
                image_url={tournament.image_url}
                currentUserId={user?.id}
                slug={tournament.slug || tournament.id}
                currency={(tournament as any).currency}
                card_badge={tournament.card_badge}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default TournamentList; 

