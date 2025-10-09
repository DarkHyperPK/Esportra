import React from 'react';
import Footer from '@/components/Footer';
import { TournamentCard } from '@/components/TournamentCard';
import { useTournaments } from '@/hooks/useTournaments';
import { LoaderCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const OngoingTournaments = () => {
  const { tournaments, loading, error } = useTournaments('ongoing');
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-esports-dark text-white flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Live Tournaments</h1>
        
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <LoaderCircle className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No ongoing tournaments at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <div key={tournament.id}>
                <TournamentCard
                  id={tournament.id}
                  name={tournament.name}
                  game={tournament.game}
                  date={tournament.date}
                  time={tournament.time}
                  venue={tournament.venue}
                  max_participants={tournament.max_participants}
                  current_participants={tournament.current_participants}
                  status={tournament.status as 'upcoming' | 'ongoing' | 'completed'}
                  team_size={tournament.team_size}
                  prize_pool={tournament.prize_pool}
                  user_id={tournament.user_id}
                  entry_fee={tournament.entry_fee}
                  is_online={tournament.is_online}
                  image_url={tournament.image_url}
                  currentUserId={user?.id}
                  slug={tournament.slug}
                />
                <div className="mt-4 p-4 bg-gaming-dark border border-gaming-gray/30 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Brackets / Fixtures</h3>
                  <p className="text-gray-400">Brackets and match fixtures will be shown here once the tournament starts.</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default OngoingTournaments;
