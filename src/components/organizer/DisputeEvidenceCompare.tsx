import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';
import type { DisputeReport, DisputeRiotAccount, MatchDisputeEvidence } from './DisputeEvidencePanel';
import DisputeScoreComparison from './DisputeScoreComparison';
import DisputeEvidenceColumn from './DisputeEvidenceColumn';
import {
  getDisputingTeamName,
  getInitialReport,
  getReporterTeamName,
} from '@/utils/disputeReportUtils';

interface DisputeEvidenceCompareProps {
  reports: DisputeReport[];
  riotAccounts: DisputeRiotAccount[];
  matchDispute?: MatchDisputeEvidence | null;
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

const DisputeEvidenceCompare: React.FC<DisputeEvidenceCompareProps> = ({
  reports,
  riotAccounts,
  matchDispute,
  fallbackEvidenceUrl,
  disputeDescription,
  matchContext,
  onImageClick,
}) => {
  const [mobileTab, setMobileTab] = useState<'initial' | 'claim'>('initial');
  const [otherReportsOpen, setOtherReportsOpen] = useState(false);
  const [riotAccountsOpen, setRiotAccountsOpen] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  const initialReport = getInitialReport(reports, matchDispute);
  const otherReports = initialReport
    ? reports.filter((r) => r.id !== initialReport.id)
    : reports;

  const reporterTeamName = getReporterTeamName(initialReport, matchContext) || 'Reporter';
  const disputingTeamName = getDisputingTeamName(matchDispute, matchContext) || 'Disputer';

  const scrollToColumn = (side: 'initial' | 'claim') => {
    const id = side === 'initial' ? 'dispute-evidence-initial' : 'dispute-evidence-claim';
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileTab(side);
  };

  const team1Accounts = riotAccounts.filter((a) => a.team_id === matchContext?.team1_id);
  const team2Accounts = riotAccounts.filter((a) => a.team_id === matchContext?.team2_id);

  if (
    reports.length === 0
    && riotAccounts.length === 0
    && !matchDispute
    && !fallbackEvidenceUrl
    && !disputeDescription
  ) {
    return null;
  }

  return (
    <div className="space-y-4">
      <DisputeScoreComparison
        initialReport={initialReport}
        matchDispute={matchDispute}
        matchContext={matchContext}
        onColumnClick={scrollToColumn}
      />

      {/* Desktop: side-by-side columns */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-4">
        <DisputeEvidenceColumn
          side="initial"
          teamLabel={reporterTeamName}
          report={initialReport}
          matchContext={matchContext}
          scrollId="dispute-evidence-initial"
          onImageClick={onImageClick}
        />
        <DisputeEvidenceColumn
          side="claim"
          teamLabel={disputingTeamName}
          matchDispute={matchDispute}
          fallbackEvidenceUrl={fallbackEvidenceUrl}
          disputeDescription={disputeDescription}
          matchContext={matchContext}
          scrollId="dispute-evidence-claim"
          onImageClick={onImageClick}
        />
      </div>

      {/* Mobile: tabs */}
      <div className="lg:hidden space-y-3">
        <div className="flex rounded-lg border border-white/[0.06] p-0.5 bg-white/[0.02]" role="tablist">
          {(['initial', 'claim'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={mobileTab === tab}
              onClick={() => setMobileTab(tab)}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition ${
                mobileTab === tab
                  ? 'bg-white/[0.08] text-white'
                  : 'text-zinc-500'
              }`}
            >
              {tab === 'initial' ? 'Initial report' : 'Dispute claim'}
            </button>
          ))}
        </div>
        {mobileTab === 'initial' ? (
          <DisputeEvidenceColumn
            side="initial"
            teamLabel={reporterTeamName}
            report={initialReport}
            matchContext={matchContext}
            scrollId="dispute-evidence-initial"
            onImageClick={onImageClick}
          />
        ) : (
          <DisputeEvidenceColumn
            side="claim"
            teamLabel={disputingTeamName}
            matchDispute={matchDispute}
            fallbackEvidenceUrl={fallbackEvidenceUrl}
            disputeDescription={disputeDescription}
            matchContext={matchContext}
            scrollId="dispute-evidence-claim"
            onImageClick={onImageClick}
          />
        )}
      </div>

      {/* Collapsible extras */}
      {otherReports.length > 0 && (
        <div className="border-t border-white/[0.06] pt-2">
          <button
            type="button"
            onClick={() => setOtherReportsOpen((v) => !v)}
            className="flex items-center justify-between w-full py-3 text-sm text-zinc-400 hover:text-white transition"
          >
            <span>Other match reports ({otherReports.length})</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${otherReportsOpen ? 'rotate-180' : ''}`} />
          </button>
          {otherReportsOpen && (
            <div className="space-y-2 pb-2">
              {otherReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center gap-3 flex-wrap p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"
                >
                  <Badge variant="outline" className="text-[10px]">Game {report.game_number}</Badge>
                  {report.map_name && <span className="text-xs text-zinc-400">{report.map_name}</span>}
                  <span className="text-sm font-mono font-bold text-white tabular-nums">
                    {report.team1_score} – {report.team2_score}
                  </span>
                  <Badge className="text-[10px] bg-white/[0.06] text-zinc-400">{report.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {riotAccounts.length > 0 && (
        <div className="border-t border-white/[0.06] pt-2">
          <button
            type="button"
            onClick={() => setRiotAccountsOpen((v) => !v)}
            className="flex items-center justify-between w-full py-3 text-sm text-zinc-400 hover:text-white transition"
          >
            <span>Player Riot accounts</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${riotAccountsOpen ? 'rotate-180' : ''}`} />
          </button>
          {riotAccountsOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
              {[
                { label: matchContext?.team1_name || 'Team 1', accounts: team1Accounts },
                { label: matchContext?.team2_name || 'Team 2', accounts: team2Accounts },
              ].map(({ label, accounts }) => (
                <div key={label} className="rounded-xl border border-white/[0.06] p-3 bg-white/[0.02]">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">
                    {label}
                  </span>
                  {accounts.length === 0 ? (
                    <span className="text-xs text-zinc-600 italic">No linked accounts</span>
                  ) : (
                    <div className="space-y-1.5">
                      {accounts.map((acct) => (
                        <div key={acct.user_id} className="text-xs font-mono text-white truncate">
                          {acct.game_name}#{acct.tag_line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {disputeDescription && initialReport && (
        <div className="border-t border-white/[0.06] pt-2">
          <button
            type="button"
            onClick={() => setDescriptionOpen((v) => !v)}
            className="flex items-center justify-between w-full py-3 text-sm text-zinc-400 hover:text-white transition"
          >
            <span>Raw description</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${descriptionOpen ? 'rotate-180' : ''}`} />
          </button>
          {descriptionOpen && (
            <p className="text-sm text-white/90 pb-2 leading-relaxed">{disputeDescription}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default DisputeEvidenceCompare;
