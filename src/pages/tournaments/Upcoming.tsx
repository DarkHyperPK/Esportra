import React, { useEffect, useState } from 'react';
import Footer from '@/components/Footer';
import { TournamentCard } from '@/components/TournamentCard';
import GameFilter from '@/components/GameFilter';
import { Tournament } from '@/hooks/useTournaments';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RegistrationDetails } from '@/types/tournament';

const UpcomingTournaments = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);

  // Get unique games from tournaments
  const availableGames = Array.from(new Set(tournaments.map(t => t.game))).sort();

  // Filter tournaments based on selected games
  const filteredTournaments = selectedGames.length > 0
    ? tournaments.filter(tournament => selectedGames.includes(tournament.game))
    : tournaments;

  const handleGameToggle = (game: string) => {
    setSelectedGames(prev =>
      prev.includes(game)
        ? prev.filter(g => g !== game)
        : [...prev, game]
    );
  };

  const handleClearAllFilters = () => {
    setSelectedGames([]);
  };

  const fetchTournaments = async () => {
    try {
      console.log('Fetching upcoming tournaments...');

      // First, let's check if we can see any tournaments at all
      const { data: allTournaments, error: allError } = await supabase
        .from('tournaments')
        .select('id, name, game, start_date, end_date, venue_id, max_teams, prize_pool, organizer_id, entry_fee, is_public, banner_url, logo_url, slug, description, status, created_at, updated_at');

      console.log('All tournaments in DB:', allTournaments);

      if (allError) {
        console.error('Error fetching all tournaments:', allError);
      }

      // Now fetch with ordering
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, game, start_date, end_date, venue_id, max_teams, prize_pool, organizer_id, entry_fee, is_public, banner_url, logo_url, slug, description, status, created_at, updated_at')
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching tournaments:', error);
        throw error;
      }

      console.log('Raw tournament data:', data);

      // Get participant counts and registration data
      const tournamentsWithExtras = await Promise.all(
        (data || []).map(async (tournament) => {
          const { count } = await supabase
            .from('tournament_participants')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', tournament.id);
          let registrationData = null;
          if (user?.id) {
            const { data: regData, error: regError } = await supabase
              .from('tournament_participants')
              .select('id, tournament_id, user_id, team_captain_id, participant_type, created_at, updated_at')
              .eq('tournament_id', tournament.id)
              .or(`user_id.eq.${user.id},team_captain_id.eq.${user.id}`)
              .maybeSingle();
            console.log('Registration fetch result:', { regData, regError, tournamentId: tournament.id, userId: user.id });
            if (regData) {
              const row = regData as any;
              registrationData = { id: row.id };
            }
          }
          console.log('TournamentCard initialData:', registrationData);

          // Transform tournament data to match expected interface
          return {
            id: tournament.id,
            name: tournament.name,
            game: tournament.game,
            date: tournament.start_date ? new Date(tournament.start_date).toISOString().split('T')[0] : '',
            time: tournament.start_date ? new Date(tournament.start_date).toTimeString().split(' ')[0] : '',
            venue: tournament.venue_id ? `Venue ${tournament.venue_id}` : 'Online',
            max_participants: tournament.max_teams,
            current_participants: count || 0,
            prize_pool: tournament.prize_pool?.toString() || '0',
            entry_fee: tournament.entry_fee?.toString() || 'Free',
            description: tournament.description || '',
            user_id: tournament.organizer_id,
            is_online: !tournament.venue_id,
            created_at: tournament.created_at,
            updated_at: tournament.updated_at,
            image_url: tournament.banner_url || tournament.logo_url,
            team_size: 1,
            slug: tournament.slug,
            status: tournament.status || 'upcoming',
            registrationData,
          };
        })
      );

      // Filter tournaments to only those whose start date/time is in the future and are not completed/finished
      const now = new Date();
      const filteredTournaments = tournamentsWithExtras.filter(t => {
        try {
          // Use the original start_date from the database for filtering
          const originalTournament = data?.find(orig => orig.id === t.id);
          if (!originalTournament?.start_date) return false;

          const start = new Date(originalTournament.start_date);
          const isFuture = start > now;
          const isActive = t.status === 'open' || t.status === 'ongoing' || t.status === 'upcoming';
          const isCompleted = t.status === 'completed' || t.status === 'cancelled';

          // Show if it's in the future OR if it's currently active (open/ongoing)
          // This ensures we don't hide tournaments that are "open" but technically started in the past
          return (isFuture || isActive) && !isCompleted;
        } catch (error) {
          console.error('Error processing tournament date:', {
            tournamentId: t.id,
            name: t.name,
            error
          });
          return false;
        }
      });

      console.log('Filtered upcoming tournaments:', filteredTournaments);
      setTournaments(filteredTournaments);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, [user]);

  const handleTournamentDelete = () => {
    fetchTournaments();
  };

  return (
    <div className="min-h-screen bg-esports-dark text-white flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-esports-primary">Upcoming Tournaments</h1>

        {/* Game Filter */}
        {availableGames.length > 0 && (
          <GameFilter
            selectedGames={selectedGames}
            onGameToggle={handleGameToggle}
            onClearAll={handleClearAllFilters}
            availableGames={availableGames}
          />
        )}

        {/* Results Counter */}
        {!isLoading && tournaments.length > 0 && (
          <div className="mb-4">
            <p className="text-gray-400">
              Showing {filteredTournaments.length} of {tournaments.length} tournaments
              {selectedGames.length > 0 && (
                <span className="text-blue-400"> (filtered by {selectedGames.join(', ')})</span>
              )}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse bg-gaming-gray/20 rounded-lg h-72"></div>
            ))
          ) : filteredTournaments.length > 0 ? (
            filteredTournaments.map((tournament) => (
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
                status={tournament.status}
                team_size={tournament.team_size}
                prize_pool={tournament.prize_pool}
                user_id={tournament.user_id}
                organizer_id={tournament.user_id}
                entry_fee={tournament.entry_fee}
                is_online={tournament.is_online}
                image_url={tournament.image_url}
                registrationData={tournament.registrationData}
                currentUserId={user?.id}
                slug={tournament.slug}
              />
            ))
          ) : tournaments.length > 0 ? (
            <div className="col-span-full text-center py-12">
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No tournaments match your filters</h3>
              <p className="text-gray-500 mb-4">Try adjusting your game filters to see more tournaments.</p>
              <button
                onClick={handleClearAllFilters}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="col-span-full text-center py-12">
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No upcoming tournaments</h3>
              <p className="text-gray-500">Check back later for new tournaments!</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UpcomingTournaments;
