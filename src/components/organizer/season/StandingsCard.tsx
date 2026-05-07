import { useSeasonStandings } from '@/hooks/useSeasonStandings';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award } from 'lucide-react';

interface StandingsCardProps {
  seasonId: string;
}

const StandingsCard: React.FC<StandingsCardProps> = ({ seasonId }) => {
  const { data: standings, isLoading } = useSeasonStandings(seasonId);

  if (isLoading) {
    return (
      <Card className="bg-[#0d0d10] border border-white/10">
        <CardContent className="p-8">
          <p className="text-gray-400 text-center">Loading standings...</p>
        </CardContent>
      </Card>
    );
  }

  if (!standings || standings.length === 0) {
    return (
      <Card className="bg-[#0d0d10] border border-white/10">
        <CardContent className="p-8">
          <p className="text-gray-400 text-center">No standings data available</p>
        </CardContent>
      </Card>
    );
  }

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-700" />;
    return null;
  };

  const getQualificationColor = (status: string | null) => {
    switch (status) {
      case 'qualified':
        return 'bg-green-500';
      case 'eliminated':
        return 'bg-red-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card className="bg-[#0d0d10] border border-white/10">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-gray-400 font-medium">Rank</th>
                <th className="text-left p-4 text-gray-400 font-medium">Team</th>
                <th className="text-right p-4 text-gray-400 font-medium">Points</th>
                <th className="text-right p-4 text-gray-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing, index) => (
                <tr key={standing.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {getRankIcon(index)}
                      <span className="font-semibold">{index + 1}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {standing.team_logo_url && (
                        <img
                          src={standing.team_logo_url}
                          alt={standing.team_name || 'Team'}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      )}
                      <span className="font-medium">{standing.team_name || 'Unknown Team'}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-2xl font-bold text-emerald-400">{standing.total_points}</span>
                  </td>
                  <td className="p-4 text-right">
                    {standing.qualification_status && (
                      <Badge className={getQualificationColor(standing.qualification_status)}>
                        {standing.qualification_status}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default StandingsCard;
