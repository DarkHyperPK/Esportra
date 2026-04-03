import React, { useCallback, useEffect, useState } from 'react';
import Footer from '@/components/Footer';
import { TournamentCard } from '@/components/TournamentCard';
import GameFilter from '@/components/GameFilter';
import { Tournament } from '@/hooks/useTournaments';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { RegistrationDetails } from '@/types/tournament';
import { formatDate, formatTime } from '@/utils/dateFormat';
import PremiumBackground from '@/components/ui/PremiumBackground';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Trophy, History } from 'lucide-react';
import { Button } from '@/components/ui/button';

const UpcomingTournaments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

      const data = await apiClient.get<any[]>('/api/tournaments/upcoming');

      console.log('Raw tournament data:', data);

      // Get registration data for current user
      let registrationMap: Record<string, any> = {};
      if (user?.id) {
        try {
          const regStatus = await apiClient.get<any[]>('/api/tournaments/me/registration-status');
          (regStatus || []).forEach((reg: any) => {
            registrationMap[reg.tournament_id] = { id: reg.id };
          });
        } catch (e) {
          console.log('Could not fetch registration status:', e);
        }
      }

      // Transform tournament data to match expected interface
      const tournamentsWithExtras = (data || []).map((tournament: any) => {
        const registrationData = registrationMap[tournament.id] || null;
        console.log('TournamentCard initialData:', registrationData);

        return {
          id: tournament.id,
          name: tournament.name,
          game: tournament.game,
          date: tournament.start_date ? formatDate(tournament.start_date) : '',
          time: tournament.start_date ? formatTime(tournament.start_date) : '',
          venue: tournament.venue_id ? `Venue ${tournament.venue_id}` : 'Online',
          max_participants: tournament.max_teams,
          current_participants: tournament.current_participants || 0,
          prize_pool: tournament.prize_pool?.toString() || '0',
          entry_fee: tournament.entry_fee?.toString() || 'Free',
          description: tournament.description || '',
          user_id: tournament.organizer_id || '',
          organizer_name: tournament.organizer_name || 'Unknown Organizer',
          is_online: !tournament.venue_id,
          created_at: tournament.created_at,
          updated_at: tournament.updated_at,
          image_url: tournament.banner_url || undefined,
          team_size: 1,
          slug: tournament.slug,
          status: tournament.status || 'open',
          registrationData,
          start_date: tournament.start_date,
          end_date: tournament.end_date,
          winner_name: tournament.winner_team_name,
        };
      });

      console.log('Filtered upcoming tournaments:', tournamentsWithExtras);
      setTournaments(tournamentsWithExtras);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, [user, location.key]);

  const handleTournamentDelete = () => {
    fetchTournaments();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
    }
  };

  return (
    <PremiumBackground animated intensity={0.15}>
      <div className="min-h-screen text-white flex flex-col pt-24 pb-12">
        <main className="flex-grow container mx-auto px-4 z-10 relative">

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="flex flex-col gap-2">
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl md:text-5xl font-bold font-heading text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-400 drop-shadow-lg"
              >
                Upcoming Tournaments
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-gray-400 font-light tracking-wide max-w-2xl"
              >
                Compete for glory and prizes. Join the next big event in the Esports ecosystem.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Button
                onClick={() => navigate('/tournament-history')}
                className="bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl px-6 py-6 group transition-all duration-300"
              >
                <History className="w-5 h-5 mr-2 text-indigo-400 group-hover:rotate-[-20deg] transition-transform" />
                <span className="font-heading uppercase tracking-widest text-xs">View Tournament History</span>
              </Button>
            </motion.div>
          </div>

          {/* Game Filter */}
          {availableGames.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <GameFilter
                selectedGames={selectedGames}
                onGameToggle={handleGameToggle}
                onClearAll={handleClearAllFilters}
                availableGames={availableGames}
              />
            </motion.div>
          )}

          {/* Results Counter */}
          {!isLoading && tournaments.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-6 flex items-center justify-between"
            >
              <p className="text-sm font-medium text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 inline-block">
                Showing <span className="text-white">{filteredTournaments.length}</span> active tournaments
                {selectedGames.length > 0 && (
                  <span className="text-esports-blue ml-1"> (filtered)</span>
                )}
              </p>
            </motion.div>
          )}

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6"
          >
            {isLoading ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="animate-pulse bg-white/5 rounded-3xl h-[320px] border border-white/5"></div>
              ))
            ) : filteredTournaments.length > 0 ? (
              filteredTournaments.map((tournament) => (
                <motion.div key={tournament.id} variants={itemVariants}>
                  <TournamentCard
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
                    organizer_name={tournament.organizer_name}
                    entry_fee={tournament.entry_fee}
                    is_online={tournament.is_online}
                    image_url={tournament.image_url}
                    registrationData={tournament.registrationData}
                    currentUserId={user?.id}
                    slug={tournament.slug}
                    currency={tournament.currency}
                    start_date={tournament.start_date}
                    end_date={tournament.end_date}
                    winner_name={tournament.winner_name}
                  />
                </motion.div>
              ))
            ) : tournaments.length > 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm">
                <h3 className="text-2xl font-bold text-white mb-2">No matches found</h3>
                <p className="text-gray-400 mb-6">No tournaments match your current filters.</p>
                <button
                  onClick={handleClearAllFilters}
                  className="px-6 py-2 rounded-xl bg-esports-blue text-white font-semibold hover:bg-blue-600 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm">
                <h3 className="text-2xl font-bold text-white mb-2">No Upcoming Tournaments</h3>
                <p className="text-gray-400">Be the first to create one or check back later!</p>
              </div>
            )}
          </motion.div>
        </main>
        <div className="relative z-10 mt-20">
          <Footer />
        </div>
      </div>
    </PremiumBackground>
  );
};

export default UpcomingTournaments;
