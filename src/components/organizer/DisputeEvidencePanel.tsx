import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, Image as ImageIcon, Shield, ChevronDown } from 'lucide-react';
import { FullScoreboard } from '@/components/tournament/FullScoreboard';
import { useToast } from '@/hooks/use-toast';

/** Report from match_result_reports, returned by enriched disputes endpoint */
export interface DisputeReport {
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
  created_at: string;
}

/** Riot account linked to a player in the match */
export interface DisputeRiotAccount {
  team_id: string;
  team_name: string;
  user_id: string;
  username: string | null;
  game_name: string;
  tag_line: string;
  puuid: string;
}

interface DisputeEvidencePanelProps {
  reports: DisputeReport[];
  riotAccounts: DisputeRiotAccount[];
  matchContext?: {
    team1_name?: string;
    team2_name?: string;
    team1_id?: string;
    team2_id?: string;
    best_of?: number;
  } | null;
  onImageClick?: (url: string) => void;
}

const DisputeEvidencePanel: React.FC<DisputeEvidencePanelProps> = ({
  reports: rawReports,
  riotAccounts: rawRiotAccounts,
  matchContext,
  onImageClick,
}) => {
  const { toast } = useToast();
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const reports = Array.isArray(rawReports) ? rawReports
    : typeof rawReports === 'string' ? (() => { try { return JSON.parse(rawReports); } catch { return []; } })()
    : [];
  const riotAccounts = Array.isArray(rawRiotAccounts) ? rawRiotAccounts
    : typeof rawRiotAccounts === 'string' ? (() => { try { return JSON.parse(rawRiotAccounts); } catch { return []; } })()
    : [];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied to clipboard` });
  };

  // Group riot accounts by team
  const team1Accounts = riotAccounts.filter(a => a.team_id === matchContext?.team1_id);
  const team2Accounts = riotAccounts.filter(a => a.team_id === matchContext?.team2_id);

  const trackerUrl = (gameName: string, tagLine: string) =>
    `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(gameName)}%23${encodeURIComponent(tagLine)}/overview`;

  if (reports.length === 0 && riotAccounts.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Match Reports */}
      {reports.length > 0 && (
        <div>
          <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            Match Reports ({reports.length})
          </label>
          <div className="space-y-2">
            {reports.map((report) => {
              const isAutoFetch = !!report.riot_match_id && !!report.match_data;
              const hasScreenshots = report.screenshot_urls && report.screenshot_urls.length > 0;
              const isExpanded = expandedReport === report.id;

              return (
                <div key={report.id} className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
                  <div
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-800/40 transition"
                    onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px] border-zinc-700">
                        Game {report.game_number}
                      </Badge>
                      {report.map_name && (
                        <span className="text-xs text-zinc-400">{report.map_name}</span>
                      )}
                      <span className="text-sm font-mono font-bold text-white">
                        {report.team1_score} – {report.team2_score}
                      </span>
                      <Badge className={`text-[10px] ${
                        report.status === 'disputed' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        : report.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}>
                        {report.status}
                      </Badge>
                      {isAutoFetch && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">Auto-fetch</Badge>}
                      {hasScreenshots && <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-[10px]">Manual</Badge>}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-3 border-t border-zinc-800/50">
                      {/* Riot Match ID */}
                      {report.riot_match_id && (
                        <div className="flex items-center gap-2 pt-2">
                          <span className="text-xs text-zinc-500">Riot Match ID:</span>
                          <code className="text-xs text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded font-mono">
                            {report.riot_match_id}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-zinc-500 hover:text-white"
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(report.riot_match_id!, 'Riot Match ID'); }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      )}

                      {/* Auto-fetch scoreboard */}
                      {isAutoFetch && (report.match_data as Record<string, unknown>)?.players && (
                        <div className="rounded-lg overflow-hidden border border-zinc-800">
                          <FullScoreboard
                            players={(report.match_data as Record<string, unknown>).players as unknown[]}
                            team1Name={matchContext?.team1_name || 'Team 1'}
                            team2Name={matchContext?.team2_name || 'Team 2'}
                            team1Score={report.team1_score}
                            team2Score={report.team2_score}
                            reportedByTeamId={report.reported_by_team_id}
                            team1Id={matchContext?.team1_id}
                            t1Side={(report.match_data as Record<string, unknown>)?.t1Side as 'Blue' | 'Red' | undefined}
                          />
                        </div>
                      )}

                      {/* Manual report screenshots */}
                      {hasScreenshots && (
                        <div>
                          <span className="text-xs text-zinc-500 mb-1 block">Evidence Screenshots</span>
                          <div className="flex gap-2 flex-wrap">
                            {report.screenshot_urls!.map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt={`Evidence ${i + 1}`}
                                className="w-32 h-20 object-cover rounded-lg border border-zinc-700 cursor-pointer hover:border-zinc-500 transition"
                                onClick={() => onImageClick?.(url)}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Riot Accounts */}
      {riotAccounts.length > 0 && (
        <div>
          <label className="text-sm font-semibold mb-2 block">Linked Riot Accounts</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: matchContext?.team1_name || 'Team 1', accounts: team1Accounts },
              { label: matchContext?.team2_name || 'Team 2', accounts: team2Accounts },
            ].map(({ label, accounts }) => (
              <div key={label} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">{label}</span>
                {accounts.length === 0 ? (
                  <span className="text-xs text-zinc-600 italic">No linked Riot accounts</span>
                ) : (
                  <div className="space-y-1.5">
                    {accounts.map((acct) => (
                      <div key={acct.user_id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-zinc-500 truncate">{acct.username || '—'}</span>
                          <span className="text-xs font-mono text-white truncate">
                            {acct.game_name}#{acct.tag_line}
                          </span>
                        </div>
                        <a
                          href={trackerUrl(acct.game_name, acct.tag_line)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex-shrink-0"
                          title="View on tracker.gg"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DisputeEvidencePanel;
