import { Trophy, Medal, Award } from 'lucide-react';
import { PublicSeasonStanding } from '@/hooks/usePublicSeasons';

interface SeasonStandingsPublicProps {
  standings: PublicSeasonStanding[];
}

export default function SeasonStandingsPublic({ standings }: SeasonStandingsPublicProps) {
  if (standings.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No standings available yet.</p>
      </div>
    );
  }

  const getStatusIcon = (status: string, rank: number) => {
    if (status === 'champion') return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 1) return <Medal className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    if (status === 'qualified') return <Award className="w-5 h-5 text-green-500" />;
    return null;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'champion':
        return 'bg-yellow-100 text-yellow-800';
      case 'qualified':
        return 'bg-green-100 text-green-800';
      case 'eliminated':
        return 'bg-red-100 text-red-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'disqualified':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Season Standings</h2>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rank</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Team/Player</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Points</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Tournaments</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Best Finish</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((standing, index) => (
              <tr key={standing.entity_id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(standing.current_status, index + 1)}
                    <span className="font-medium text-gray-900">#{index + 1}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {standing.avatar_url && (
                      <img
                        src={standing.avatar_url}
                        alt={standing.display_name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                    <span className="font-medium text-gray-900">{standing.display_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {standing.total_points}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {standing.tournaments_played}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  #{standing.best_finish}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${getStatusBadge(standing.current_status)}`}>
                    {standing.current_status.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
