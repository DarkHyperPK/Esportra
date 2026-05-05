import { useState } from 'react';
import { AlertTriangle, UserPlus, Search, ChevronRight } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

interface Team {
  id: string;
  name: string;
  logo_url: string;
}

interface Tournament {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface ManualOverrideInterfaceProps {
  seasonId: string;
}

export default function ManualOverrideInterface({ seasonId }: ManualOverrideInterfaceProps) {
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [targetSeed, setTargetSeed] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [teamSearch, setTeamSearch] = useState<string>('');

  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['seasonTeams', seasonId],
    queryFn: () => apiClient.get<Team[]>(`/api/seasons/${seasonId}/teams`),
  });

  const { data: tournaments, isLoading: tournamentsLoading } = useQuery({
    queryKey: ['seasonTournaments', seasonId],
    queryFn: () => apiClient.get<Tournament[]>(`/api/seasons/${seasonId}/tournaments`),
  });

  const overrideMutation = useMutation({
    mutationFn: (data: { teamId: string; targetTournamentId: string; targetSeed: number; reason: string }) =>
      apiClient.post(`/api/seasons/${seasonId}/advancement/manual-override`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonAdvancementRecords', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['adminAuditLogs', seasonId] });
      // Reset form
      setSelectedTeam(null);
      setSelectedTournament(null);
      setTargetSeed(1);
      setReason('');
      setTeamSearch('');
    },
  });

  const filteredTeams = teams?.filter((team) =>
    team.name.toLowerCase().includes(teamSearch.toLowerCase())
  ) || [];

  const handleOverride = () => {
    if (!selectedTeam || !selectedTournament || !reason) {
      alert('Please fill in all required fields');
      return;
    }

    if (!confirm(`Are you sure you want to manually advance ${selectedTeam.name} to ${selectedTournament.name}? This action will be logged.`)) {
      return;
    }

    overrideMutation.mutate({
      teamId: selectedTeam.id,
      targetTournamentId: selectedTournament.id,
      targetSeed,
      reason,
    });
  };

  if (teamsLoading || tournamentsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
        <h2 className="text-2xl font-bold text-gray-900">Manual Override</h2>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-orange-800">
          <strong>Warning:</strong> Manual overrides should only be used in exceptional circumstances. 
          All manual overrides are logged and audited. Use this feature responsibly.
        </p>
      </div>

      <div className="bg-white border rounded-lg p-6 space-y-6">
        {/* Team Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Team</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              placeholder="Search teams..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg">
            {filteredTeams.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No teams found</div>
            ) : (
              filteredTeams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left ${
                    selectedTeam?.id === team.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  {team.logo_url && (
                    <img src={team.logo_url} alt={team.name} className="w-8 h-8 rounded-full object-cover" />
                  )}
                  <span className="font-medium text-gray-900">{team.name}</span>
                  {selectedTeam?.id === team.id && <ChevronRight className="w-4 h-4 text-blue-600 ml-auto" />}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Tournament Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Target Tournament</label>
          <div className="max-h-40 overflow-y-auto border rounded-lg">
            {!tournaments || tournaments.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No tournaments available</div>
            ) : (
              tournaments.map((tournament) => (
                <button
                  key={tournament.id}
                  onClick={() => setSelectedTournament(tournament)}
                  className={`w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left ${
                    selectedTournament?.id === tournament.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div>
                    <div className="font-medium text-gray-900">{tournament.name}</div>
                    <div className="text-sm text-gray-600 capitalize">{tournament.status}</div>
                  </div>
                  {selectedTournament?.id === tournament.id && <ChevronRight className="w-4 h-4 text-blue-600" />}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Target Seed */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Target Seed</label>
          <input
            type="number"
            min="1"
            value={targetSeed}
            onChange={(e) => setTargetSeed(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">The seed position the team will receive in the target tournament.</p>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Reason <span className="text-red-500">*</span></label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Explain why this manual override is necessary..."
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">This reason will be logged in the audit trail.</p>
        </div>

        {/* Summary */}
        {selectedTeam && selectedTournament && (
          <div className="bg-gray-50 border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Override Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Team:</span>
                <span className="font-medium text-gray-900">{selectedTeam.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Target Tournament:</span>
                <span className="font-medium text-gray-900">{selectedTournament.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Target Seed:</span>
                <span className="font-medium text-gray-900">#{targetSeed}</span>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleOverride}
          disabled={!selectedTeam || !selectedTournament || !reason || overrideMutation.isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <UserPlus className="w-4 h-4" />
          <span>{overrideMutation.isPending ? 'Processing...' : 'Execute Manual Override'}</span>
        </button>
      </div>
    </div>
  );
}
