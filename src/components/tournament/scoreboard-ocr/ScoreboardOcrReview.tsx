import { useMemo } from 'react';
import { CtaButton, GhostButton } from '@/components/ui/app-buttons';
import { EYEBROW_CLASS, InlineNotice } from '@/components/ui/kit';
import type { ValorantAgentOption } from '@/hooks/useScoreboardOcr';
import { liveStatus } from '@/services/scoreboardOcr';
import type { OcrDraft, OcrDraftPlayer, OcrVerification, TeamSlot } from '@/types/scoreboardOcr';
import { ScoreboardOcrRow, type RowPatch } from './ScoreboardOcrRow';
import { desktopGridClass, mobileStatsGridClass, visibleStats, type ReviewStat } from './reviewStats';
import { cn } from '@/lib/utils';
import { ScoreboardOcrScoreHeader } from './ScoreboardOcrScoreHeader';

interface Props {
  draft: OcrDraft;
  teamNames: Record<TeamSlot, string>;
  agents: ValorantAgentOption[];
  errors: string[];
  submitting: boolean;
  onScoreChange: (team: TeamSlot, value: number | null) => void;
  onPlayerChange: (key: string, patch: RowPatch) => void;
  /** Roster check from the API, by row; badges update locally when a name is edited. */
  verification?: OcrVerification | null;
  onSubmit: () => void;
  onManual: () => void;
  /** Preview only (staff test bench): no submit or manual-entry actions. */
  readOnly?: boolean;
}

const rowIndex = (player: OcrDraftPlayer) => Number(player.key.replace('row-', ''));

function TeamGroup({ title, players, ...rest }: { title: string; players: OcrDraftPlayer[]; stats: ReviewStat[]; offset: number } & Pick<Props, 'teamNames' | 'agents' | 'onPlayerChange' | 'verification'>) {
  if (players.length === 0) return null;
  return (
    <section aria-label={title} className="border border-white/[0.07] bg-black/20 px-3 py-2">
      <div className={cn('hidden gap-2 pb-1 sm:grid', desktopGridClass(rest.stats.length))}>
        <span className={EYEBROW_CLASS}>{title}</span>
        <span className={EYEBROW_CLASS}>Agent</span>
        <span className={EYEBROW_CLASS}>Player</span>
        {rest.stats.map((s) => <span key={s.key} title={s.title} className={`${EYEBROW_CLASS} text-center`}>{s.label}</span>)}
      </div>
      <p className={`${EYEBROW_CLASS} pb-1 sm:hidden`}>{title}</p>
      <div className={cn('grid gap-2 pb-1 sm:hidden', mobileStatsGridClass(rest.stats.length))} aria-hidden>
        {rest.stats.map((s) => <span key={s.key} className={`${EYEBROW_CLASS} text-center`}>{s.label}</span>)}
      </div>
      {players.map((player, i) => (
        <ScoreboardOcrRow
          key={player.key}
          player={player}
          index={rest.offset + i}
          teamNames={rest.teamNames}
          agents={rest.agents}
          stats={rest.stats}
          verification={liveStatus(player.name, rest.verification?.players.find((v) => v.index === rowIndex(player)))}
          onChange={(patch) => rest.onPlayerChange(player.key, patch)}
        />
      ))}
    </section>
  );
}

export function ScoreboardOcrReview({ draft, teamNames, agents, errors, submitting, onScoreChange, onPlayerChange, onSubmit, onManual, readOnly = false, verification }: Props) {
  const groups = useMemo(() => ({
    unassigned: draft.players.filter((p) => p.team === null),
    team1: draft.players.filter((p) => p.team === 'team1'),
    team2: draft.players.filter((p) => p.team === 'team2'),
  }), [draft.players]);
  const stats = useMemo(() => visibleStats(draft.columns), [draft.columns]);
  const shared = { teamNames, agents, onPlayerChange, stats, verification };

  return (
    <div className="space-y-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <figure className="border border-white/[0.07] bg-black/40">
          <a href={draft.screenshotUrl} target="_blank" rel="noopener noreferrer" className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400">
            <img src={draft.screenshotUrl} alt="Uploaded scoreboard screenshot" className="max-h-[22rem] w-full object-contain" loading="lazy" />
          </a>
          <figcaption className="px-3 py-2 text-xs text-zinc-500">Your screenshot. Open it full size to compare.</figcaption>
        </figure>
        <div className="space-y-3">
          <ScoreboardOcrScoreHeader
            team1Name={teamNames.team1}
            team2Name={teamNames.team2}
            team1Score={draft.team1Score}
            team2Score={draft.team2Score}
            mapName={draft.mapName}
            uncertain={draft.uncertainScore}
            onChange={onScoreChange}
          />
          <p className="text-[13px] text-zinc-400">Read from your screenshot. Give it a quick look and fix anything that's off before sending.</p>
        </div>
      </div>
      <div className="space-y-3">
        <TeamGroup title="Needs a team" players={groups.unassigned} offset={0} {...shared} />
        <TeamGroup title={teamNames.team1} players={groups.team1} offset={groups.unassigned.length} {...shared} />
        <TeamGroup title={teamNames.team2} players={groups.team2} offset={groups.unassigned.length + groups.team1.length} {...shared} />
        {errors.length > 0 && (
          <InlineNotice tone="critical" title="Fix these before sending">
            <ul className="list-disc pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
          </InlineNotice>
        )}
        {!readOnly && <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <GhostButton type="button" onClick={onManual} disabled={submitting}>Enter result manually</GhostButton>
          <CtaButton type="button" onClick={onSubmit} disabled={submitting}>
            {submitting ? 'Sending…' : 'Send to opponent to confirm'}
          </CtaButton>
        </div>}
      </div>
    </div>
  );
}
