import { Calendar, Clock, MapPin } from 'lucide-react';
import { PublicSeasonTournament } from '@/hooks/usePublicSeasons';

interface SeasonScheduleProps {
  tournaments: PublicSeasonTournament[];
}

export default function SeasonSchedule({ tournaments }: SeasonScheduleProps) {
  if (tournaments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No schedule available yet.</p>
      </div>
    );
  }

  // Sort tournaments by start date
  const sortedTournaments = [...tournaments].sort((a, b) => {
    if (!a.starts_at) return 1;
    if (!b.starts_at) return -1;
    return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isUpcoming = (tournament: PublicSeasonTournament) => {
    if (!tournament.starts_at) return false;
    return new Date(tournament.starts_at) > new Date();
  };

  const isPast = (tournament: PublicSeasonTournament) => {
    if (!tournament.ends_at) return false;
    return new Date(tournament.ends_at) < new Date();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Schedule</h2>

      <div className="space-y-3">
        {sortedTournaments.map((tournament) => {
          const upcoming = isUpcoming(tournament);
          const past = isPast(tournament);

          return (
            <div
              key={tournament.season_tournament_id}
              className={`border rounded-lg p-4 ${
                upcoming
                  ? 'border-blue-200 bg-blue-50'
                  : past
                  ? 'border-gray-200 bg-gray-50 opacity-60'
                  : 'border-green-200 bg-green-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Tournament Name */}
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {tournament.display_name || tournament.tournament_name}
                  </h3>

                  {/* Date & Time */}
                  {tournament.starts_at && (
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(tournament.starts_at)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(tournament.starts_at)}</span>
                      </div>
                    </div>
                  )}

                  {/* Region */}
                  {tournament.region && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span className="capitalize">{tournament.region}</span>
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div>
                  {upcoming && (
                    <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Upcoming
                    </span>
                  )}
                  {past && (
                    <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      Completed
                    </span>
                  )}
                  {!upcoming && !past && (
                    <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      Live
                    </span>
                  )}
                </div>
              </div>

              {/* Registration Deadline */}
              {tournament.registration_deadline && upcoming && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Registration deadline: {formatDate(tournament.registration_deadline)}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
