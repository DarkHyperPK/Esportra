import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Search, ExternalLink, Copy, Shield, AlertTriangle, CheckCircle, Loader2,
} from 'lucide-react';
import { FullScoreboard } from '@/components/tournament/FullScoreboard';

interface MatchCheckerProps {
  tournamentId: string;
  /** Pre-fill with a match ID (e.g. from dispute link) */
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

const MatchChecker: React.FC<MatchCheckerProps> = ({ tournamentId, initialMatchId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [matchIdInput, setMatchIdInput] = useState(initialMatchId || '');
  const [activeMatchId, setActiveMatchId] = useState<string | null>(initialMatchId || null);
  const [overrideScores, setOverrideScores] = useState<{ game: number; t1: string; t2: string; notes: string } | null>(null);

  const { data, isLoading, error } = useQuery<VerifyData>({
    queryKey: ['match-verify', activeMatchId],
    queryFn: () => apiClient.get<VerifyData>(`/api/matches/${activeMatchId}/verify`),
    enabled: !!activeMatchId,
  });

  const resolveDispute = useMutation({
    mutationFn: (params: { disputeId: string; status: string; resolution: string }) =>
      apiClient.post(`/api/organizer/disputes/${params.disputeId}/resolve`, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-verify', activeMatchId] });
      toast({ title: 'Dispute resolved', description: 'The dispute has been updated.' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied` });
  };

  const trackerUrl = (gameName: string, tagLine: string) =>
    `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(gameName)}%23${encodeURIComponent(tagLine)}/overview`;

  const handleSearch = () => {
    const trimmed = matchIdInput.trim();
    if (!trimmed) return;
    setActiveMatchId(trimmed);
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
        <Input
          value={matchIdInput}
          onChange={(e) => setMatchIdInput(e.target.value)}
          placeholder="Enter Match ID (UUID)"
          className="bg-zinc-900 border-zinc-800 text-white font-mono text-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={!matchIdInput.trim() || isLoading} className="bg-emerald-600 hover:bg-emerald-700">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
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
              <Card key={label} className="bg-zinc-900/40 border-zinc-800">
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-bold text-white">{label}'s Reports</h4>

                  {teamReports.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">No reports submitted</p>
                  ) : teamReports.map((report) => (
                    <div key={report.id} className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">Game {report.game_number}</Badge>
                        {report.map_name && <span className="text-xs text-zinc-400">{report.map_name}</span>}
                        <span className="text-sm font-mono font-bold text-white">{report.team1_score}–{report.team2_score}</span>
                        <Badge className={`text-[10px] ${report.status === 'disputed' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          {report.status}
                        </Badge>
                      </div>

                      {report.riot_match_id && (
                        <div className="flex items-center gap-1">
                          <code className="text-[10px] text-zinc-400 font-mono truncate">{report.riot_match_id}</code>
                          <Button variant="ghost" size="sm" className="h-5 px-1" onClick={() => copyToClipboard(report.riot_match_id!, 'Match ID')}>
                            <Copy className="w-3 h-3 text-zinc-500" />
                          </Button>
                        </div>
                      )}

                      {/* Scoreboard */}
                      {report.match_data && (report.match_data as Record<string, unknown>).players && (
                        <div className="rounded-lg overflow-hidden border border-zinc-800">
                          <FullScoreboard
                            players={(report.match_data as Record<string, unknown>).players as unknown[]}
                            team1Name={data.match.team1_name}
                            team2Name={data.match.team2_name}
                            team1Score={report.team1_score}
                            team2Score={report.team2_score}
                            reportedByTeamId={report.reported_by_team_id}
                            team1Id={data.match.team1_id}
                            t1Side={(report.match_data as Record<string, unknown>)?.t1Side as 'Blue' | 'Red' | undefined}
                          />
                        </div>
                      )}

                      {/* Screenshots */}
                      {report.screenshot_urls && report.screenshot_urls.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {report.screenshot_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt={`Evidence ${i+1}`} className="w-24 h-16 object-cover rounded border border-zinc-700 hover:border-zinc-500" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Riot Accounts */}
                  {accounts.length > 0 && (
                    <div className="pt-2 border-t border-zinc-800">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Riot Accounts</span>
                      <div className="mt-1 space-y-1">
                        {accounts.map((acct) => (
                          <div key={acct.user_id} className="flex items-center justify-between text-xs">
                            <span className="text-zinc-400">{acct.username} · <span className="font-mono text-white">{acct.game_name}#{acct.tag_line}</span></span>
                            <a href={trackerUrl(acct.game_name, acct.tag_line)} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Resolve Actions */}
          {data.reports.some(r => r.status === 'disputed') && (
            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-300">Quick Resolve</span>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {team1Reports.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      onClick={() => setOverrideScores({ game: 1, t1: '', t2: '', notes: `Accepted ${data.match.team1_name}'s report` })}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      Accept {data.match.team1_name}'s Report
                    </Button>
                  )}
                  {team2Reports.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      onClick={() => setOverrideScores({ game: 1, t1: '', t2: '', notes: `Accepted ${data.match.team2_name}'s report` })}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      Accept {data.match.team2_name}'s Report
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                    onClick={() => setOverrideScores({ game: 1, t1: '', t2: '', notes: '' })}
                  >
                    Override with Custom Score
                  </Button>
                </div>

                {overrideScores && (
                  <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={overrideScores.t1}
                        onChange={(e) => setOverrideScores({ ...overrideScores, t1: e.target.value })}
                        placeholder={data.match.team1_name}
                        className="w-20 bg-zinc-800 border-zinc-700 text-center"
                      />
                      <span className="text-zinc-500 text-xs">vs</span>
                      <Input
                        type="number"
                        value={overrideScores.t2}
                        onChange={(e) => setOverrideScores({ ...overrideScores, t2: e.target.value })}
                        placeholder={data.match.team2_name}
                        className="w-20 bg-zinc-800 border-zinc-700 text-center"
                      />
                    </div>
                    <Textarea
                      value={overrideScores.notes}
                      onChange={(e) => setOverrideScores({ ...overrideScores, notes: e.target.value })}
                      placeholder="Resolution notes..."
                      className="bg-zinc-800 border-zinc-700 text-white min-h-[60px] text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={!overrideScores.notes.trim()}>
                        Submit Resolution
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setOverrideScores(null)} className="text-zinc-400">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
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
