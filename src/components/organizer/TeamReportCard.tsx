import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy } from 'lucide-react';
import { FullScoreboard } from '@/components/tournament/FullScoreboard';
import { useToast } from '@/hooks/use-toast';

interface Report {
  id: string;
  game_number: number;
  reported_by_team_id: string;
  riot_match_id: string | null;
  map_name: string | null;
  team1_score: number;
  team2_score: number;
  match_data: Record<string, unknown> | null; // Riot API scoreboard JSON
  screenshot_urls: string[] | null;
  status: string;
}

interface RiotAccount {
  user_id: string;
  username: string;
  game_name: string;
  tag_line: string;
}

interface TeamReportCardProps {
  teamName: string;
  reports: Report[];
  accounts: RiotAccount[];
  matchTeam1Name: string;
  matchTeam2Name: string;
  matchTeam1Id: string;
}

const TeamReportCard: React.FC<TeamReportCardProps> = ({
  teamName, reports, accounts, matchTeam1Name, matchTeam2Name, matchTeam1Id,
}) => {
  const { toast } = useToast();
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied` });
  };

  return (
    <Card className="bg-zinc-900/40 border-zinc-800">
      <CardContent className="p-4 space-y-3">
        <h4 className="text-sm font-bold text-white">{teamName}'s Reports</h4>

        {reports.length === 0 ? (
          <p className="text-xs text-zinc-500 italic">No reports submitted</p>
        ) : reports.map((report) => (
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

            {report.match_data && (report.match_data as Record<string, unknown>).players && (
              <div className="rounded-lg overflow-hidden border border-zinc-800">
                <FullScoreboard
                  players={(report.match_data as Record<string, unknown>).players as unknown[]}
                  team1Name={matchTeam1Name}
                  team2Name={matchTeam2Name}
                  team1Score={report.team1_score}
                  team2Score={report.team2_score}
                  reportedByTeamId={report.reported_by_team_id}
                  team1Id={matchTeam1Id}
                  t1Side={(report.match_data as Record<string, unknown>)?.t1Side as 'Blue' | 'Red' | undefined}
                />
              </div>
            )}

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

        {accounts.length > 0 && (
          <div className="pt-2 border-t border-zinc-800">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Riot Accounts</span>
            <div className="mt-1 space-y-1">
              {accounts.map((acct) => (
                <div key={acct.user_id} className="flex items-center text-xs">
                  <span className="text-zinc-400">{acct.username} · <span className="font-mono text-white">{acct.game_name}#{acct.tag_line}</span></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamReportCard;
