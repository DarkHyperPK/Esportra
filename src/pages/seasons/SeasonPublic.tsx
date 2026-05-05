import { useParams } from 'react-router-dom';
import { usePublicSeason, usePublicSeasonTournaments, usePublicSeasonStandings } from '@/hooks/usePublicSeasons';
import SeasonHero from '@/components/season/public/SeasonHero';
import SeasonTournamentFlow from '@/components/season/public/SeasonTournamentFlow';
import SeasonStandingsPublic from '@/components/season/public/SeasonStandingsPublic';
import SeasonSchedule from '@/components/season/public/SeasonSchedule';
import { Loader2 } from 'lucide-react';

export default function SeasonPublic() {
  const { slug } = useParams<{ slug: string }>();
  const { data: season, isLoading: seasonLoading, error: seasonError } = usePublicSeason(slug!);
  const { data: tournaments, isLoading: tournamentsLoading } = usePublicSeasonTournaments(season?.id || '');
  const { data: standings, isLoading: standingsLoading } = usePublicSeasonStandings(season?.id || '');

  if (seasonLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (seasonError || !season) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Season Not Found</h1>
          <p className="text-gray-600">The season you're looking for doesn't exist or is not public.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <SeasonHero season={season} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Tournament Flow & Schedule */}
          <div className="lg:col-span-2 space-y-8">
            {/* Tournament Flow */}
            <div className="bg-white rounded-lg border p-6">
              {tournamentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <SeasonTournamentFlow tournaments={tournaments || []} />
              )}
            </div>

            {/* Schedule */}
            <div className="bg-white rounded-lg border p-6">
              {tournamentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <SeasonSchedule tournaments={tournaments || []} />
              )}
            </div>
          </div>

          {/* Right Column - Standings */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border p-6 sticky top-4">
              {standingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <SeasonStandingsPublic standings={standings || []} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
