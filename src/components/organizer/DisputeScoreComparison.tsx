import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { DisputeReport, MatchDisputeEvidence } from './DisputeEvidencePanel';
import { getDisputingTeamName, getReporterTeamName } from '@/utils/disputeReportUtils';

interface MatchContext {
  team1_name?: string;
  team2_name?: string;
  team1_id?: string;
  team2_id?: string;
}

interface DisputeScoreComparisonProps {
  initialReport: DisputeReport | null;
  matchDispute?: MatchDisputeEvidence | null;
  matchContext?: MatchContext | null;
  onColumnClick?: (side: 'initial' | 'claim') => void;
}

const DisputeScoreComparison: React.FC<DisputeScoreComparisonProps> = ({
  initialReport,
  matchDispute,
  matchContext,
  onColumnClick,
}) => {
  const team1Name = matchContext?.team1_name || 'Team 1';
  const team2Name = matchContext?.team2_name || 'Team 2';
  const reporterName = getReporterTeamName(initialReport, matchContext) || team1Name;
  const disputerName = getDisputingTeamName(matchDispute, matchContext) || team2Name;

  const team1Score = initialReport?.team1_score ?? null;
  const team2Score = initialReport?.team2_score ?? null;
  const mapName = initialReport?.map_name;
  const gameNumber = initialReport?.game_number;

  const reporterIsTeam1 = initialReport
    ? initialReport.reported_by_team_id === matchContext?.team1_id
    : true;

  const reporterScore = reporterIsTeam1 ? team1Score : team2Score;
  const disputerScore = reporterIsTeam1 ? team2Score : team1Score;

  return (
    <div
      className="rounded-xl border border-white/[0.06] overflow-hidden"
      aria-label="Score comparison"
    >
      <div className="grid grid-cols-[1fr_auto_1fr]">
        <button
          type="button"
          onClick={() => onColumnClick?.('initial')}
          className="p-4 text-left border-r border-white/[0.06] bg-emerald-500/5 hover:bg-emerald-500/8 transition"
          aria-label={`Initial report from ${reporterName}`}
        >
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
            Initial report
          </p>
          <p className="text-base font-semibold text-white truncate">{reporterName}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Reporter</p>
          <p className="text-4xl font-bold tabular-nums text-white mt-2">
            {reporterScore ?? '—'}
          </p>
          {mapName && (
            <p className="text-xs text-zinc-400 mt-1">
              {mapName}{gameNumber != null ? ` · G${gameNumber}` : ''}
            </p>
          )}
          {initialReport && (
            <Badge className="mt-2 text-[10px] bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
              {initialReport.status === 'disputed' ? 'Under dispute' : initialReport.status}
            </Badge>
          )}
        </button>

        <div className="flex flex-col items-center justify-center px-3 bg-white/[0.02] min-w-[48px]">
          <span className="text-2xl font-light text-zinc-600">–</span>
          {initialReport && (
            <span className="text-[10px] text-zinc-500 mt-1">vs</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onColumnClick?.('claim')}
          className="p-4 text-right border-l border-white/[0.06] bg-amber-500/5 hover:bg-amber-500/8 transition"
          aria-label={`Dispute claim from ${disputerName}`}
        >
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
            Dispute claim
          </p>
          <p className="text-base font-semibold text-white truncate">{disputerName}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Disputer</p>
          <p className="text-4xl font-bold tabular-nums text-white mt-2">
            {disputerScore ?? '—'}
          </p>
          {mapName && (
            <p className="text-xs text-zinc-400 mt-1">
              {mapName}{gameNumber != null ? ` · G${gameNumber}` : ''}
            </p>
          )}
          <Badge className="mt-2 text-[10px] bg-amber-500/15 text-amber-300 border-amber-500/30">
            Disputed
          </Badge>
        </button>
      </div>
    </div>
  );
};

export default DisputeScoreComparison;
