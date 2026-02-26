import React, { useEffect, useState } from 'react';
import Footer from '@/components/Footer';
import { TournamentCard } from '@/components/TournamentCard';
import GameFilter from '@/components/GameFilter';
import { Tournament } from '@/hooks/useTournaments';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RegistrationDetails } from '@/types/tournament';
import PremiumBackground from '@/components/ui/PremiumBackground';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trophy, History } from 'lucide-react';
import { Button } from '@/components/ui/button';

const UpcomingTournaments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
        .select('id, name, game, start_date, end_date, venue_id, max_teams, prize_pool, organization_id, entry_fee, is_public, banner_url, logo_url, slug, description, status, created_at, updated_at')
        .eq('is_public', true)
        .is('deleted_at', null);

      console.log('All tournaments in DB:', allTournaments);

      if (allError) {
        console.error('Error fetching all tournaments:', allError);
      }

      // Now fetch with ordering
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          id, name, game, start_date, end_date, venue_id, max_teams, prize_pool, organization_id, entry_fee, is_public, banner_url, logo_url, slug, description, status, created_at, updated_at,
          organization:organizations (
            name, owner_id
          )
        `)
        .eq('is_public', true)
        .is('deleted_at', null)
        .not('status', 'in', '("completed","cancelled")')
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
            date: tournament.start_date ? new Date(tournament.start_date).toLocaleDateString('en-CA') : '',
            time: tournament.start_date ? new Date(tournament.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
            venue: tournament.venue_id ? `Venue ${tournament.venue_id}` : 'Online',
            max_participants: tournament.max_teams,
            current_participants: count || 0,
            prize_pool: tournament.prize_pool?.toString() || '0',
            entry_fee: tournament.entry_fee?.toString() || 'Free',
            description: tournament.description || '',
            user_id: (() => {
              const org = tournament.organization as any;
              if (org) {
                if (Array.isArray(org) && org.length > 0) return org[0].owner_id;
                if (!Array.isArray(org) && org.owner_id) return org.owner_id;
              }
              return '';
            })(),
            organizer_name: (() => {
              const org = tournament.organization as any;
              if (org) {
                if (Array.isArray(org) && org.length > 0) return org[0].name;
                if (!Array.isArray(org) && org.name) return org.name;
              }
              return 'Unknown Organizer';
            })(),
            is_online: !tournament.venue_id,
            created_at: tournament.created_at,
            updated_at: tournament.updated_at,
            image_url: tournament.banner_url || tournament.logo_url,
            team_size: 1,
            slug: tournament.slug,
            status: tournament.status || 'open',
            registrationData,
            start_date: tournament.start_date,
            end_date: tournament.end_date,
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
          const isActive = t.status === 'open' || t.status === 'ongoing';
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
                    start_date={tournament.start_date}
                    end_date={tournament.end_date}
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
