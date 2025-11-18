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
        // Fetch venues
        const { data: venuesData, error: venuesError } = await supabase
          .from('venues')
          .select('*')
          .limit(4);
        
        if (venuesError) throw venuesError;
        setVenues(venuesData || []);

        // Fetch tournaments
        const { data: tournamentsData, error: tournamentsError } = await supabase
          .from('tournaments')
          .select('*')
          .eq('status', 'open')
          .limit(4);
        
        if (tournamentsError) throw tournamentsError;
        
        // Fetch user registrations if logged in
        let userRegistrations: any[] = [];
        if (user && user.id) {
          const { data: regData, error: regError } = await supabase
            .from('tournament_participants')
            .select('id, tournament_id, user_id, registration_type, created_at')
            .eq('user_id', user.id);
          if (regError) throw regError;
          userRegistrations = regData || [];
        }
        setRegistrations(userRegistrations);

        // Get participant counts in a separate query
        const participantCounts = await Promise.all(
          (tournamentsData || []).map(async (tournament) => {
            const { count } = await supabase
              .from('tournament_participants')
              .select('*', { count: 'exact', head: true })
              .eq('tournament_id', tournament.id);
            return { id: tournament.id, count: count || 0 };
          })
        );

        const formattedTournaments = (tournamentsData || []).map(t => {
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
            current_participants: participantCounts.find(pc => pc.id === t.id)?.count || 0,
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
      <section className="container mx-auto px-4 py-10 max-w-7xl">
        <div className="flex items-center gap-4 md:gap-6 flex-wrap mb-6 md:mb-8">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">Featured Venues</h2>
          <Link to="/venues/featured">
            <Button variant="outline" className="btn-esports-green">
              <MapPin className="mr-2 h-4 w-4" />
              View All Venues
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse bg-gaming-gray/20 rounded-lg h-64"></div>
            ))
          ) : venues.length > 0 ? (
            venues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
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
      <section className="container mx-auto px-4 py-10 max-w-7xl">
        <div className="flex items-center gap-4 md:gap-6 flex-wrap mb-6 md:mb-8">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">Upcoming Tournaments</h2>
          <Link to="/tournaments/upcoming">
            <Button variant="outline" className="btn-esports-orange">
              <Calendar className="mr-2 h-4 w-4" />
              View All Tournaments
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse bg-gaming-gray/20 rounded-lg h-64"></div>
            ))
          ) : tournaments.length > 0 ? (
            tournaments.map((tournament) => (
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
                organizer_id={tournament.organizer_id}
                entry_fee={tournament.entry_fee}
                is_online={tournament.is_online}
                image_url={tournament.image_url}
                registrationData={tournament.registrationData}
                currentUserId={user?.id}
                slug={tournament.slug}
              />
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

      <UseModes />
      <Footer />
    </div>
  );
};

export default Index;
