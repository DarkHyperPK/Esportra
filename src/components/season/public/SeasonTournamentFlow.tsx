import { ArrowRight, Lock, ExternalLink, UserPlus } from 'lucide-react';
import { PublicSeasonTournament } from '@/hooks/usePublicSeasons';
import { useNavigate } from 'react-router-dom';

interface SeasonTournamentFlowProps {
  tournaments: PublicSeasonTournament[];
  userQualificationStatus?: Map<string, boolean>; // tournament_id -> is_qualified
}

export default function SeasonTournamentFlow({ tournaments, userQualificationStatus }: SeasonTournamentFlowProps) {
  const navigate = useNavigate();

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No tournaments in this season yet.</p>
      </div>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'qualifier':
        return 'bg-blue-100 text-blue-800';
      case 'event':
        return 'bg-purple-100 text-purple-800';
      case 'playoff':
        return 'bg-orange-100 text-orange-800';
      case 'grand_final':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isRegistrationOpen = (tournament: PublicSeasonTournament) => {
    if (!tournament.registration_deadline) return false;
    return new Date(tournament.registration_deadline) > new Date() && 
           tournament.tournament_status === 'scheduled';
  };

  const isLocked = (tournament: PublicSeasonTournament) => {
    // Tournament is locked if user is not qualified and it's not a qualifier
    const isQualified = userQualificationStatus?.get(tournament.tournament_id);
    if (tournament.role === 'qualifier') return false;
    return !isQualified;
  };

  const handleRegister = (tournament: PublicSeasonTournament) => {
    navigate(`/tournaments/${tournament.tournament_slug}/register`);
  };

  const handleViewTournament = (tournament: PublicSeasonTournament) => {
    navigate(`/tournaments/${tournament.tournament_slug}`);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Tournament Circuit</h2>
      
      <div className="grid gap-4">
        {tournaments.map((tournament, index) => (
          <div key={tournament.season_tournament_id} className="relative">
            {/* Tournament Card */}
            <div
              className={`border rounded-lg p-4 transition-all ${
                isLocked(tournament) 
                  ? 'border-gray-200 bg-gray-50 opacity-75' 
                  : 'border-gray-300 bg-white hover:border-blue-400 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Role Badge */}
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize mb-2 ${getRoleBadgeColor(tournament.role)}`}>
                    {tournament.role.replace('_', ' ')}
                  </span>

                  {/* Tournament Name */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {tournament.display_name || tournament.tournament_name}
                  </h3>

                  {/* Meta Info */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span className="capitalize">{tournament.region}</span>
                    <span className="capitalize">{tournament.tournament_status}</span>
                    {tournament.starts_at && (
                      <span>
                        {new Date(tournament.starts_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {isLocked(tournament) ? (
                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                      <Lock className="w-4 h-4" />
                      <span>Locked</span>
                    </div>
                  ) : isRegistrationOpen(tournament) ? (
                    <button
                      onClick={() => handleRegister(tournament)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Register</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleViewTournament(tournament)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="View Tournament"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Locked Message */}
              {isLocked(tournament) && tournament.role !== 'qualifier' && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Qualify from a previous tournament to enter.
                  </p>
                </div>
              )}

              {/* Registration Deadline */}
              {isRegistrationOpen(tournament) && tournament.registration_deadline && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Registration closes: {new Date(tournament.registration_deadline).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* Arrow to next tournament */}
            {index < tournaments.length - 1 && (
              <div className="flex justify-center py-2">
                <ArrowRight className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
