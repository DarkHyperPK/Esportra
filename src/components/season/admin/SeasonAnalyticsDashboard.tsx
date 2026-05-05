import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { Users, Trophy, TrendingUp, Clock, Activity, BarChart3 } from 'lucide-react';

interface SeasonAnalyticsDashboardProps {
  seasonId?: string;
}

interface AnalyticsData {
  total_participants: number;
  total_tournaments: number;
  completed_tournaments: number;
  total_advancements: number;
  manual_overrides: number;
  average_participation_rate: number;
  top_performers: Array<{
    entity_id: string;
    display_name: string;
    total_points: number;
    tournaments_played: number;
    best_finish: number;
  }>;
  tournament_completion_rates: Array<{
    tournament_id: string;
    tournament_name: string;
    completion_rate: number;
    total_participants: number;
  }>;
  advancement_flow: Array<{
    from_tournament: string;
    to_tournament: string;
    count: number;
  }>;
}

export default function SeasonAnalyticsDashboard({ seasonId }: SeasonAnalyticsDashboardProps) {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['seasonAnalytics', seasonId],
    queryFn: () => apiClient.get<AnalyticsData>(`/api/seasons/${seasonId}/analytics`),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const data = analytics || {
    total_participants: 0,
    total_tournaments: 0,
    completed_tournaments: 0,
    total_advancements: 0,
    manual_overrides: 0,
    average_participation_rate: 0,
    top_performers: [],
    tournament_completion_rates: [],
    advancement_flow: [],
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Season Analytics</h2>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-600">Total Participants</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{data.total_participants}</div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-gray-600">Completed Tournaments</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {data.completed_tournaments} / {data.total_tournaments}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-600">Total Advancements</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{data.total_advancements}</div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-purple-500" />
            <span className="text-sm text-gray-600">Manual Overrides</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{data.manual_overrides}</div>
        </div>
      </div>

      {/* Participation Rate */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Participation Rate</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${data.average_participation_rate}%` }}
              />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {data.average_participation_rate.toFixed(1)}%
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Average participation rate across all tournaments
        </p>
      </div>

      {/* Top Performers */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
        {data.top_performers.length === 0 ? (
          <p className="text-gray-500 text-sm">No performance data available yet.</p>
        ) : (
          <div className="space-y-3">
            {data.top_performers.map((performer, index) => (
              <div key={performer.entity_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{performer.display_name}</div>
                    <div className="text-sm text-gray-600">
                      {performer.tournaments_played} tournaments • Best: #{performer.best_finish}
                    </div>
                  </div>
                </div>
                <div className="text-xl font-bold text-gray-900">{performer.total_points} pts</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tournament Completion Rates */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tournament Completion Rates</h3>
        {data.tournament_completion_rates.length === 0 ? (
          <p className="text-gray-500 text-sm">No completion data available yet.</p>
        ) : (
          <div className="space-y-4">
            {data.tournament_completion_rates.map((tournament) => (
              <div key={tournament.tournament_id}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{tournament.tournament_name}</span>
                  <span className="text-sm text-gray-600">
                    {tournament.completion_rate.toFixed(1)}% ({tournament.total_participants} participants)
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${tournament.completion_rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Advancement Flow */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Advancement Flow</h3>
        {data.advancement_flow.length === 0 ? (
          <p className="text-gray-500 text-sm">No advancement data available yet.</p>
        ) : (
          <div className="space-y-3">
            {data.advancement_flow.map((flow, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 text-right">
                  <span className="font-medium text-gray-900">{flow.from_tournament}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    {flow.count}
                  </div>
                  <BarChart3 className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{flow.to_tournament}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Season Progress</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {data.total_tournaments > 0
              ? ((data.completed_tournaments / data.total_tournaments) * 100).toFixed(0)
              : 0}%
          </div>
          <p className="text-sm text-blue-700 mt-1">
            {data.completed_tournaments} of {data.total_tournaments} tournaments completed
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">Advancement Success</span>
          </div>
          <div className="text-2xl font-bold text-green-900">
            {data.total_advancements > 0
              ? (((data.total_advancements - data.manual_overrides) / data.total_advancements) * 100).toFixed(0)
              : 100}%
          </div>
          <p className="text-sm text-green-700 mt-1">
            {data.total_advancements - data.manual_overrides} automatic advancements
          </p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-900">Override Rate</span>
          </div>
          <div className="text-2xl font-bold text-orange-900">
            {data.total_advancements > 0
              ? ((data.manual_overrides / data.total_advancements) * 100).toFixed(1)
              : 0}%
          </div>
          <p className="text-sm text-orange-700 mt-1">
            {data.manual_overrides} manual interventions
          </p>
        </div>
      </div>
    </div>
  );
}
