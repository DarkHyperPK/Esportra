import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, ChevronDown, ImageOff } from 'lucide-react';
import { FullScoreboard } from '@/components/tournament/FullScoreboard';
import { useToast } from '@/hooks/use-toast';
import type { DisputeReport, MatchDisputeEvidence } from './DisputeEvidencePanel';
import { resolveDisputingEvidenceUrls } from '@/utils/disputeReportUtils';

interface MatchContext {
  team1_name?: string;
  team2_name?: string;
  team1_id?: string;
  team2_id?: string;
  best_of?: number;
}

interface DisputeEvidenceColumnProps {
  side: 'initial' | 'claim';
  teamLabel: string;
  report?: DisputeReport | null;
  matchDispute?: MatchDisputeEvidence | null;
  fallbackEvidenceUrl?: string | null;
  disputeDescription?: string | null;
  matchContext?: MatchContext | null;
  scrollId?: string;
  onImageClick?: (url: string) => void;
}

const DisputeEvidenceColumn: React.FC<DisputeEvidenceColumnProps> = ({
  side,
  teamLabel,
  report,
  matchDispute,
  fallbackEvidenceUrl,
  disputeDescription,
  matchContext,
  scrollId,
  onImageClick,
}) => {
  const { toast } = useToast();
  const [scoreboardOpen, setScoreboardOpen] = useState(false);
  const [techOpen, setTechOpen] = useState(false);

  const isInitial = side === 'initial';
  const borderCls = isInitial ? 'border-emerald-500/20' : 'border-amber-500/20';
  const bgCls = isInitial ? 'bg-emerald-500/[0.03]' : 'bg-amber-500/[0.03]';
  const accentCls = isInitial ? 'text-emerald-400' : 'text-amber-400';
  const hoverBorder = isInitial ? 'hover:border-emerald-500/40' : 'hover:border-amber-500/40';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied to clipboard` });
  };

  const disputingReason = matchDispute?.reason?.trim() || disputeDescription?.trim() || null;
  const disputingEvidenceUrls = resolveDisputingEvidenceUrls(matchDispute, fallbackEvidenceUrl);

  const hasScreenshots = report?.screenshot_urls && report.screenshot_urls.length > 0;
  const matchData = report?.match_data as Record<string, unknown> | null;
  const hasPlayers = !!report?.riot_match_id && !!matchData?.players;
  const playerCount = hasPlayers && Array.isArray(matchData?.players) ? matchData.players.length : 0;

  const sectionLabel = isInitial
    ? `Initial report — ${teamLabel}`
    : `Dispute claim — ${teamLabel}`;

  if (!isInitial && !disputingReason && disputingEvidenceUrls.length === 0) {
    return (
      <div
        id={scrollId}
        className={`rounded-xl border border-dashed ${borderCls} ${bgCls} p-6 text-center`}
        aria-label={sectionLabel}
      >
        <ImageOff className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
        <p className="text-sm text-zinc-500">No counter-evidence uploaded</p>
        <p className="text-[11px] text-zinc-600 mt-1">The disputing team did not attach screenshots.</p>
      </div>
    );
  }

  if (isInitial && !report) {
    return (
      <div
        id={scrollId}
        className={`rounded-xl border border-dashed ${borderCls} ${bgCls} p-6 text-center`}
        aria-label={sectionLabel}
      >
        <p className="text-sm text-zinc-500">No structured report on file</p>
        {disputeDescription && (
          <p className="text-sm text-white/90 mt-3 text-left bg-[#121214] p-3 rounded-xl border border-white/[0.06] leading-relaxed">
            {disputeDescription}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      id={scrollId}
      className={`rounded-xl border ${borderCls} ${bgCls} overflow-hidden`}
      aria-label={sectionLabel}
      role="region"
    >
      <div className={`px-4 py-3 border-b ${isInitial ? 'border-emerald-500/10' : 'border-amber-500/10'}`}>
        <p className={`text-[11px] uppercase tracking-wider font-semibold ${accentCls}`}>
          {isInitial ? 'Initial report' : 'Dispute claim'}
        </p>
        <p className="text-sm font-semibold text-white mt-0.5">{teamLabel}</p>
        {isInitial && report && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {report.map_name && (
              <span className="text-xs text-zinc-400">{report.map_name}</span>
            )}
            <span className="text-sm font-mono font-bold text-white tabular-nums">
              {report.team1_score} – {report.team2_score}
            </span>
            <Badge className="text-[10px] bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
              {report.status === 'disputed' ? 'Under dispute' : report.status}
            </Badge>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {!isInitial && disputingReason && (
          <div>
            <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">
              Dispute reason
            </span>
            <p className="text-sm text-white/90 leading-relaxed">{disputingReason}</p>
          </div>
        )}

        {isInitial && hasScreenshots && (
          <div>
            <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">
              Screenshots
            </span>
            <div className="grid grid-cols-2 gap-2">
              {report!.screenshot_urls!.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Evidence screenshot ${i + 1} from ${teamLabel}`}
                  className={`w-full h-36 object-contain rounded-lg border border-white/[0.06] bg-black/40 cursor-pointer ${hoverBorder} hover:brightness-110 transition`}
                  onClick={() => onImageClick?.(url)}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ))}
            </div>
          </div>
        )}

        {!isInitial && disputingEvidenceUrls.length > 0 && (
          <div>
            <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">
              Counter-evidence
            </span>
            <div className="grid grid-cols-2 gap-2">
              {disputingEvidenceUrls.map((url, i) => (
                <img
                  key={`${url}-${i}`}
                  src={url}
                  alt={`Counter-evidence ${i + 1} from ${teamLabel}`}
                  className={`w-full h-36 object-contain rounded-lg border border-white/[0.06] bg-black/40 cursor-pointer ${hoverBorder} hover:brightness-110 transition`}
                  onClick={() => onImageClick?.(url)}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ))}
            </div>
          </div>
        )}

        {isInitial && hasPlayers && (
          <div>
            <button
              type="button"
              onClick={() => setScoreboardOpen((v) => !v)}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition w-full"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${scoreboardOpen ? 'rotate-180' : ''}`} />
              View scoreboard ({playerCount} players)
            </button>
            {scoreboardOpen && (
              <div className="mt-3">
                <FullScoreboard
                  players={matchData!.players as unknown[]}
                  team1Name={matchContext?.team1_name || 'Team 1'}
                  team2Name={matchContext?.team2_name || 'Team 2'}
                  team1Score={report!.team1_score}
                  team2Score={report!.team2_score}
                  reportedByTeamId={report!.reported_by_team_id}
                  team1Id={matchContext?.team1_id}
                  t1Side={matchData?.t1Side as 'Blue' | 'Red' | undefined}
                />
              </div>
            )}
          </div>
        )}

        {isInitial && report?.riot_match_id && (
          <div>
            <button
              type="button"
              onClick={() => setTechOpen((v) => !v)}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition w-full"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${techOpen ? 'rotate-180' : ''}`} />
              Technical details
            </button>
            {techOpen && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default DisputeEvidenceColumn;
