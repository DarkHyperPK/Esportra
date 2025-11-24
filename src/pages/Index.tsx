import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import SponsorsBanner from "@/components/SponsorsBanner";
import LocationFilter from "@/components/LocationFilter";
import VenueCard from "@/components/VenueCard";
import { TournamentCard } from "@/components/TournamentCard";
import UseModes from "@/components/UseModes";
import FeaturesSection from "@/components/FeaturesSection";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin } from "lucide-react";
import { Venue } from "@/hooks/useVenueSearch";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileLoading } from "@/components/profile/ProfileLoading";
import { supabase } from "@/lib/supabase";
import { Tournament } from "@/hooks/useTournaments";
import { motion } from 'framer-motion';

const Index = () => {
  const { user, profile, loading } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // (no-op helper removed in favor of fixed responsive grid)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // PARALLELIZE all independent queries
        const [venuesResult, tournamentsResult, registrationsResult] = await Promise.all([
          // Fetch venues
          supabase
            .from('venues')
            .select('*')
            .limit(4),
          
          // Fetch tournaments
          supabase
            .from('tournaments')
            .select('*')
            .eq('status', 'open')
            .limit(4),
          
          // Fetch user registrations if logged in (or empty array)
          user && user.id
            ? supabase
                .from('tournament_participants')
                .select('id, tournament_id, user_id, participant_type, created_at')
                .eq('user_id', user.id)
            : Promise.resolve({ data: [], error: null })
        ]);

        if (venuesResult.error) throw venuesResult.error;
        if (tournamentsResult.error) throw tournamentsResult.error;
        if (registrationsResult.error) throw registrationsResult.error;

        setVenues(venuesResult.data || []);
        const tournamentsData = tournamentsResult.data || [];
        const userRegistrations = registrationsResult.data || [];
        setRegistrations(userRegistrations);

        // OPTIMIZED: Fetch all participant counts in ONE query instead of N queries
        const tournamentIds = tournamentsData.map(t => t.id);
        let participantCountsMap = new Map<string, number>();
        
        if (tournamentIds.length > 0) {
          // Single query to get counts for all tournaments
          const { data: countsData, error: countsError } = await supabase
            .from('tournament_participants')
            .select('tournament_id')
            .in('tournament_id', tournamentIds);
          
          if (!countsError && countsData) {
            // Count participants per tournament
            countsData.forEach((p: any) => {
              const tournamentId = p.tournament_id;
              participantCountsMap.set(tournamentId, (participantCountsMap.get(tournamentId) || 0) + 1);
            });
          }
        }

        const formattedTournaments = tournamentsData.map(t => {
          // Compute status based on date/time
          const now = new Date();
          const start = new Date(`${t.date}T${t.time}`);
          let status: 'upcoming' | 'ongoing' | 'completed' = 'upcoming';
          if (now >= start) {
            status = 'ongoing';
          }
          return {
            ...t,
            status,
            current_participants: participantCountsMap.get(t.id) || 0,
            team_size: t.team_size ?? 1,
            registrationData: userRegistrations.find(r => r.tournament_id === t.id)
          };
        });
        
        setTournaments(formattedTournaments);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return <ProfileLoading />;
  }

  return (
    <div className="min-h-screen bg-esports-dark text-white">
      <HeroSection />
      <SponsorsBanner />
      
      {/* Featured Venues Section */}
      <section className="container mx-auto px-4 py-16 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-4 md:gap-6 flex-wrap mb-8 md:mb-12"
        >
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
              Featured <span className="text-gradient bg-clip-text text-transparent bg-gradient-to-r from-esports-green to-esports-blue">Venues</span>
            </h2>
            <p className="text-gray-400">Discover premium gaming spaces near you</p>
          </div>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="animate-pulse bg-gaming-gray/20 rounded-lg h-64"
              />
            ))
          ) : venues.length > 0 ? (
            venues.map((venue, index) => (
              <motion.div
                key={venue.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1, ease: 'easeOut' }}
              >
                <VenueCard venue={venue} />
              </motion.div>
            ))
          ) : (
            <div className="col-span-4">
              <div className="border border-gaming-gray/30 rounded-xl bg-gaming-dark/60 p-8 text-center max-w-xl mx-auto">
                <p className="text-gray-300 mb-3">No venues are featured right now.</p>
                <Link to="/venues/featured">
                  <Button size="sm" className="bg-gaming-purple hover:bg-gaming-purple/80">Explore venues</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Tournaments Section */}
      <section className="container mx-auto px-4 py-16 max-w-7xl bg-gradient-to-b from-transparent via-gaming-dark/30 to-transparent">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-4 md:gap-6 flex-wrap mb-8 md:mb-12"
        >
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
              Upcoming <span className="text-gradient bg-clip-text text-transparent bg-gradient-to-r from-esports-orange to-gaming-purple">Tournaments</span>
            </h2>
            <p className="text-gray-400">Join the competition and compete for glory</p>
          </div>
          <Link to="/tournaments/upcoming" className="ml-auto">
            <Button variant="outline" size="lg" className="btn-esports-orange border-2">
              <Calendar className="mr-2 h-4 w-4" />
              View All Tournaments
            </Button>
          </Link>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse bg-gaming-gray/20 rounded-lg h-64"></div>
            ))
          ) : tournaments.length > 0 ? (
            tournaments.map((tournament, index) => (
              <motion.div
                key={tournament.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1, ease: 'easeOut' }}
              >
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
                  organizer_id={tournament.organizer_id}
                  entry_fee={tournament.entry_fee}
                  is_online={tournament.is_online}
                  image_url={tournament.image_url}
                  registrationData={tournament.registrationData}
                  currentUserId={user?.id}
                  slug={tournament.slug}
                />
              </motion.div>
            ))
          ) : (
            <div className="col-span-4">
              <div className="border border-gaming-gray/30 rounded-xl bg-gaming-dark/60 p-8 text-center max-w-xl mx-auto">
                <p className="text-gray-300 mb-3">No tournaments available right now.</p>
                <Link to="/tournaments/upcoming">
                  <Button size="sm" className="bg-gaming-purple hover:bg-gaming-purple/80">Browse tournaments</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <FeaturesSection />
      <UseModes />
      <Footer />
    </div>
  );
};

export default Index;
