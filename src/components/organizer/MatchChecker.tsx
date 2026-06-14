import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, AlertTriangle, Loader2, X } from 'lucide-react';
import TeamReportCard from './TeamReportCard';

interface MatchCheckerProps {
  tournamentId: string;
  initialMatchId?: string;
}

interface VerifyData {
  match: {
    id: string;
    team1_id: string;
    team2_id: string;
    team1_name: string;
    team2_name: string;
    team1_score: number;
    team2_score: number;
    match_number: number;
    best_of: number;
    status: string;
    bracket_type: string;
  };
  reports: Array<{
    id: string;
    game_number: number;
    reported_by_team_id: string;
    reported_by_name: string;
    reported_by_team_name: string;
    riot_match_id: string | null;
    map_name: string | null;
    team1_score: number;
    team2_score: number;
    match_data: Record<string, unknown> | null; // Riot scoreboard JSON
    screenshot_urls: string[] | null;
    status: string;
    created_at: string;
  }>;
  riotAccounts: Array<{
    team_id: string;
    team_name: string;
    user_id: string;
    username: string;
    game_name: string;
    tag_line: string;
    puuid: string;
  }>;
  games: Array<{
    id: string;
    game_number: number;
    map_name: string;
    status: string;
  }>;
}

const MatchChecker: React.FC<MatchCheckerProps> = ({ tournamentId: _tournamentId, initialMatchId }) => {
  const [matchIdInput, setMatchIdInput] = useState(initialMatchId || '');
  const [activeMatchId, setActiveMatchId] = useState<string | null>(initialMatchId || null);

  const { data, isLoading, error } = useQuery<VerifyData>({
    queryKey: ['match-verify', activeMatchId],
    queryFn: () => apiClient.get<VerifyData>(`/api/matches/${activeMatchId}/verify`),
    enabled: !!activeMatchId,
  });

  const handleSearch = () => {
    const trimmed = matchIdInput.trim();
    if (!trimmed) return;
    setActiveMatchId(trimmed);
  };

  const handleClear = () => {
    setMatchIdInput('');
    setActiveMatchId(null);
  };

  // Group reports by team
  const team1Reports = data?.reports.filter(r => r.reported_by_team_id === data.match.team1_id) || [];
  const team2Reports = data?.reports.filter(r => r.reported_by_team_id === data.match.team2_id) || [];
  const team1Accounts = data?.riotAccounts.filter(a => a.team_id === data.match.team1_id) || [];
  const team2Accounts = data?.riotAccounts.filter(a => a.team_id === data.match.team2_id) || [];

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={matchIdInput}
            onChange={(e) => setMatchIdInput(e.target.value)}
            placeholder="Enter Match ID (UUID)"
            className="bg-zinc-900 border-zinc-800 text-white font-mono text-sm pr-8"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          {(matchIdInput || activeMatchId) && (
            <button
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button type="button" onClick={handleSearch} disabled={!matchIdInput.trim() || isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {(error as Error).message || 'Failed to load match data'}
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {/* Match Header */}
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-white font-bold">{data.match.team1_name}</span>
                  <span className="font-mono text-lg font-black text-white">
                    {data.match.team1_score} – {data.match.team2_score}
                  </span>
                  <span className="text-white font-bold">{data.match.team2_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                    Match #{data.match.match_number} · BO{data.match.best_of}
                  </Badge>
                  <Badge className={`text-[10px] ${
                    data.match.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400'
                    : data.match.status === 'disputed' ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {data.match.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Side-by-side Reports */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: data.match.team1_name, reports: team1Reports, accounts: team1Accounts },
              { label: data.match.team2_name, reports: team2Reports, accounts: team2Accounts },
            ].map(({ label, reports: teamReports, accounts }) => (
              <TeamReportCard
                key={label}
                teamName={label}
                reports={teamReports}
                accounts={accounts}
                matchTeam1Name={data.match.team1_name}
                matchTeam2Name={data.match.team2_name}
                matchTeam1Id={data.match.team1_id}
              />
            ))}
          </div>
        </div>
      )}

      {!activeMatchId && !isLoading && (
        <div className="text-center py-12 text-zinc-500 text-sm">
          <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
          Enter a Match ID to verify results and review reports.
        </div>
      )}
    </div>
  );
};

export default MatchChecker;
