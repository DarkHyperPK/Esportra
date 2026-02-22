import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { Tournament } from '@/hooks/useTournaments';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
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

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user?.id)
        .maybeSingle();

      if (orgError) throw orgError;

      if (!orgData) {
        setTournaments([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('organization_id', orgData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to include status and set current_participants to 0
      const tournamentsWithCounts = (data || []).map((tournament) => {
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
          current_participants: 0,
          status,
          team_size: tournament.team_size ?? 1
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
                className="pl-10 bg-gaming-gray/10 border-gaming-gray/30"
                placeholder="Search tournaments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              onClick={() => navigate('/tournaments/create')}
              className="bg-gaming-purple hover:bg-gaming-purple/80"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Tournament
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-gaming-gray/20 h-64 rounded-lg" />
            ))}
          </div>
        ) : filteredTournaments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No tournaments found</p>
            <Button
              onClick={handleCreateTournament}
              className="bg-gaming-purple hover:bg-gaming-purple/80"
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
                status={tournament.status as 'draft' | 'open' | 'closed' | 'check_in' | 'ongoing' | 'completed' | 'cancelled'}
                team_size={tournament.team_size}
                prize_pool={tournament.prize_pool}
                organizer_id={tournament.organizer_id}
                entry_fee={tournament.entry_fee}
                is_online={tournament.is_online}
                image_url={tournament.image_url}
                currentUserId={user?.id}
                slug={tournament.slug || tournament.id}
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
