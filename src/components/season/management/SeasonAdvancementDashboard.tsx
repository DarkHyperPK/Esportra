import { useState } from 'react';
import { ArrowRight, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, Filter } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

interface AdvancementRecord {
  id: string;
  season_id: string;
  connection_id: string | null;
  from_tournament_id: string | null;
  to_tournament_id: string;
  entity_id: string;
  entity_type: string;
  source_rank: number | null;
  target_seed: number;
  status: string;
  advanced_at: string;
  advanced_by: string;
  reason: string;
  from_tournament_name: string;
  to_tournament_name: string;
  entity_name: string;
}

interface SeasonAdvancementDashboardProps {
  seasonId: string;
}

export default function SeasonAdvancementDashboard({ seasonId }: SeasonAdvancementDashboardProps) {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTournament, setFilterTournament] = useState<string>('all');

  const { data: records, isLoading } = useQuery({
    queryKey: ['seasonAdvancementRecords', seasonId],
    queryFn: () => apiClient.get<AdvancementRecord[]>(`/api/seasons/${seasonId}/advancement-records`),
  });

  const { data: tournaments } = useQuery({
    queryKey: ['seasonTournaments', seasonId],
    queryFn: () => apiClient.get<any[]>(`/api/seasons/${seasonId}/tournaments`),
  });

  const handleProcessAdvancement = async (tournamentId: string) => {
    try {
      await apiClient.post(`/api/seasons/${seasonId}/advancement/process`, { tournamentId });
      queryClient.invalidateQueries({ queryKey: ['seasonAdvancementRecords', seasonId] });
    } catch (error) {
      console.error('Failed to process advancement:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'advanced':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'blocked':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'manual_override':
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'advanced':
        return 'bg-green-100 text-green-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'manual_override':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRecords = records?.filter((record) => {
    if (filterStatus !== 'all' && record.status !== filterStatus) return false;
    if (filterTournament !== 'all' && record.to_tournament_id !== filterTournament) return false;
    return true;
  }) || [];

  const uniqueTournaments = tournaments || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Advancement Dashboard</h2>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="advanced">Advanced</option>
            <option value="pending">Pending</option>
            <option value="blocked">Blocked</option>
            <option value="manual_override">Manual Override</option>
          </select>
          <select
            value={filterTournament}
            onChange={(e) => setFilterTournament(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Tournaments</option>
            {uniqueTournaments.map((t: any) => (
              <option key={t.tournament_id} value={t.tournament_id}>
                {t.tournament_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Total Advancements</div>
          <div className="text-2xl font-bold text-gray-900">{records?.length || 0}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Advanced</div>
          <div className="text-2xl font-bold text-green-600">
            {records?.filter((r) => r.status === 'advanced').length || 0}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">
            {records?.filter((r) => r.status === 'pending').length || 0}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Manual Overrides</div>
          <div className="text-2xl font-bold text-blue-600">
            {records?.filter((r) => r.status === 'manual_override').length || 0}
          </div>
        </div>
      </div>

      {/* Advancement Records Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Team/Player</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">From</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">To</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Rank</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Seed</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Advanced At</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reason</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No advancement records found.
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => (
                <tr key={record.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(record.status)}
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${getStatusBadge(record.status)}`}>
                        {record.status.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {record.entity_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {record.from_tournament_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div className="flex items-center gap-1">
                      {record.from_tournament_name && <ArrowRight className="w-4 h-4" />}
                      {record.to_tournament_name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {record.source_rank ? `#${record.source_rank}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    #{record.target_seed}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600 text-sm">
                    {new Date(record.advanced_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm max-w-xs truncate">
                    {record.reason}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Tournament Processing Actions */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Process Advancement</h3>
        <p className="text-sm text-gray-600 mb-4">
          Manually trigger advancement processing for completed tournaments.
        </p>
        <div className="flex flex-wrap gap-2">
          {tournaments?.map((tournament: any) => (
            <button
              key={tournament.tournament_id}
              onClick={() => handleProcessAdvancement(tournament.tournament_id)}
              disabled={tournament.tournament_status !== 'completed'}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{tournament.tournament_name}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                tournament.tournament_status === 'completed' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {tournament.tournament_status}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
