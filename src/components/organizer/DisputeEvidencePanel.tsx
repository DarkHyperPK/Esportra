import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Shield, ChevronDown } from 'lucide-react';
import { FullScoreboard } from '@/components/tournament/FullScoreboard';
import { useToast } from '@/hooks/use-toast';
import {
  getDisputingTeamName,
  getPrimaryDisputeReport,
  getReporterTeamName,
  resolveDisputingEvidenceUrls,
} from '@/utils/disputeReportUtils';

/** Report from match_result_reports, returned by enriched disputes endpoint */
export interface DisputeReport {
  id: string;
  game_number: number;
  reported_by_team_id: string;
  riot_match_id: string | null;
  map_name: string | null;
  team1_score: number;
  team2_score: number;
  match_data: Record<string, unknown> | null;
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

/** Counter-evidence filed when disputing a match result report */
export interface MatchDisputeEvidence {
  id?: string;
  reason?: string | null;
  evidence_urls?: string[] | null;
  disputed_by_team_id?: string | null;
  disputed_by_user_id?: string | null;
  disputed_by_name?: string | null;
  disputed_by_team_name?: string | null;
  created_at?: string | null;
  status?: string | null;
}

interface DisputeEvidencePanelProps {
  reports: DisputeReport[];
  riotAccounts: DisputeRiotAccount[];
  matchDispute?: MatchDisputeEvidence | null;
  /** Legacy single URL on tournament_disputes when match_disputes.evidence_urls is empty */
  fallbackEvidenceUrl?: string | null;
  disputeDescription?: string | null;
  matchContext?: {
    team1_name?: string;
    team2_name?: string;
    team1_id?: string;
    team2_id?: string;
    best_of?: number;
  } | null;
  onImageClick?: (url: string) => void;
}

const ReportDetailBlock: React.FC<{
  report: DisputeReport;
  matchContext?: DisputeEvidencePanelProps['matchContext'];
  onImageClick?: (url: string) => void;
  copyToClipboard: (text: string, label: string) => void;
}> = ({ report, matchContext, onImageClick, copyToClipboard }) => {
  const isAutoFetch = !!report.riot_match_id && !!report.match_data;
  const hasScreenshots = report.screenshot_urls && report.screenshot_urls.length > 0;
  const matchData = report.match_data as Record<string, unknown> | null;
  const hasPlayers = isAutoFetch && matchData?.players;

  return (
    <div className="space-y-3">
      {report.riot_match_id && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-500">Riot match ID:</span>
          <code className="text-xs text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded font-mono">
            {report.riot_match_id}
          </code>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-zinc-500 hover:text-white"
            onClick={() => copyToClipboard(report.riot_match_id!, 'Riot Match ID')}
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      )}

      {hasPlayers && (
        <FullScoreboard
          players={matchData!.players as unknown[]}
          team1Name={matchContext?.team1_name || 'Team 1'}
          team2Name={matchContext?.team2_name || 'Team 2'}
          team1Score={report.team1_score}
          team2Score={report.team2_score}
          reportedByTeamId={report.reported_by_team_id}
          team1Id={matchContext?.team1_id}
          t1Side={matchData?.t1Side as 'Blue' | 'Red' | undefined}
        />
      )}

      {hasScreenshots && (
        <div>
          <span className="text-xs text-zinc-500 mb-2 block font-medium uppercase tracking-wider">
            Uploaded evidence
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {report.screenshot_urls!.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Evidence ${i + 1}`}
                className="w-full h-28 sm:h-32 object-contain rounded-lg border border-white/[0.06] bg-black/40 cursor-pointer hover:border-rose-500/30 hover:brightness-110 transition"
                onClick={() => onImageClick?.(url)}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const DisputeEvidencePanel: React.FC<DisputeEvidencePanelProps> = ({
  reports,
  riotAccounts,
  matchDispute,
  fallbackEvidenceUrl,
  disputeDescription,
  matchContext,
  onImageClick,
}) => {
  const { toast } = useToast();
  const [expandedReport, setExpandedReport] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied to clipboard` });
  };

  const primaryReport = getPrimaryDisputeReport(reports);
  const otherReports = primaryReport
    ? reports.filter((r) => r.id !== primaryReport.id)
    : reports;
  const reporterTeamName = getReporterTeamName(primaryReport, matchContext);
  const disputingTeamName = getDisputingTeamName(matchDispute, matchContext);
  const disputingEvidenceUrls = resolveDisputingEvidenceUrls(matchDispute, fallbackEvidenceUrl);
  const disputingReason = matchDispute?.reason?.trim() || disputeDescription?.trim() || null;
  const showDisputingSide = !!(disputingReason || disputingEvidenceUrls.length > 0);

  const team1Accounts = riotAccounts.filter((a) => a.team_id === matchContext?.team1_id);
  const team2Accounts = riotAccounts.filter((a) => a.team_id === matchContext?.team2_id);

  if (reports.length === 0 && riotAccounts.length === 0 && !showDisputingSide) return null;

  return (
    <div className="space-y-4">
      {primaryReport && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-rose-500/10 flex items-center justify-between gap-3 flex-wrap">
            <label className="text-sm font-semibold text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-rose-400" />
              {reporterTeamName ? `Reported by ${reporterTeamName}` : 'Initial reported result'}
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] border-white/[0.06]">
                Game {primaryReport.game_number}
              </Badge>
              {primaryReport.map_name && (
                <span className="text-xs text-zinc-300 font-medium">{primaryReport.map_name}</span>
              )}
              <span className="text-sm font-mono font-bold text-white">
                {primaryReport.team1_score} – {primaryReport.team2_score}
              </span>
              <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px]">
                {primaryReport.status}
              </Badge>
              {primaryReport.riot_match_id && primaryReport.match_data && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">
                  Val / Riot verified
                </Badge>
              )}
              {primaryReport.screenshot_urls?.length && !primaryReport.match_data && (
                <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-[10px]">
                  Manual upload
                </Badge>
              )}
            </div>
          </div>
          <div className="p-4">
            <ReportDetailBlock
              report={primaryReport}
              matchContext={matchContext}
              onImageClick={onImageClick}
              copyToClipboard={copyToClipboard}
            />
          </div>
        </div>
      )}

      {showDisputingSide && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-500/10 flex items-center justify-between gap-3 flex-wrap">
            <label className="text-sm font-semibold text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-400" />
              {disputingTeamName ? `Disputed by ${disputingTeamName}` : 'Disputing team evidence'}
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {matchDispute?.disputed_by_name && (
                <span className="text-xs text-zinc-400">{matchDispute.disputed_by_name}</span>
              )}
              {matchDispute?.status && (
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                  {matchDispute.status}
                </Badge>
              )}
              {disputingEvidenceUrls.length > 0 && (
                <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-[10px]">
                  {disputingEvidenceUrls.length} file{disputingEvidenceUrls.length === 1 ? '' : 's'}
                </Badge>
              )}
            </div>
          </div>
          <div className="p-4 space-y-3">
            {disputingReason && (
              <div>
                <span className="text-xs text-zinc-500 mb-1.5 block font-medium uppercase tracking-wider">
                  Dispute reason
                </span>
                <p className="text-sm text-white/90 bg-[#121214] p-3 rounded-xl border border-white/[0.06] leading-relaxed">
                  {disputingReason}
                </p>
              </div>
            )}
            {disputingEvidenceUrls.length > 0 ? (
              <div>
                <span className="text-xs text-zinc-500 mb-2 block font-medium uppercase tracking-wider">
                  Uploaded counter-evidence
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {disputingEvidenceUrls.map((url, i) => (
                    <img
                      key={`${url}-${i}`}
                      src={url}
                      alt={`Counter-evidence ${i + 1}`}
                      className="w-full h-28 sm:h-32 object-contain rounded-lg border border-white/[0.06] bg-black/40 cursor-pointer hover:border-amber-500/30 hover:brightness-110 transition"
                      onClick={() => onImageClick?.(url)}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">
                No counter-evidence image was stored for this dispute.
              </p>
            )}
          </div>
        </div>
      )}

      {otherReports.length > 0 && (
        <div>
          <label className="text-sm font-semibold mb-2 block flex items-center gap-2 text-zinc-400">
            Other match reports ({otherReports.length})
          </label>
          <div className="space-y-2">
            {otherReports.map((report) => {
              const isExpanded = expandedReport === report.id;
              const isAutoFetch = !!report.riot_match_id && !!report.match_data;
              const hasScreenshots = report.screenshot_urls && report.screenshot_urls.length > 0;

              return (
                <div key={report.id} className="bg-[#0a0a0c] border border-white/[0.06] rounded-xl overflow-hidden">
                  <div
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition"
                    onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="outline" className="text-[10px] border-white/[0.06]">
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
                      {isAutoFetch && (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">
                          Auto-fetch
                        </Badge>
                      )}
                      {hasScreenshots && !isAutoFetch && (
                        <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-[10px]">
                          Manual
                        </Badge>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>

                  {isExpanded && (
                    <div className="border-t border-zinc-800/50 p-4">
                      <ReportDetailBlock
                        report={report}
                        matchContext={matchContext}
                        onImageClick={onImageClick}
                        copyToClipboard={copyToClipboard}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {riotAccounts.length > 0 && (
        <div>
          <label className="text-sm font-semibold mb-2 block">Linked Riot accounts</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: matchContext?.team1_name || 'Team 1', accounts: team1Accounts },
              { label: matchContext?.team2_name || 'Team 2', accounts: team2Accounts },
            ].map(({ label, accounts }) => (
              <div key={label} className="bg-[#0a0a0c] border border-white/[0.06] rounded-xl p-3">
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
