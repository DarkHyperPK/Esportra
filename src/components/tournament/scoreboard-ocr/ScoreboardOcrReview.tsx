import { useMemo } from 'react';
import { CtaButton, GhostButton } from '@/components/ui/app-buttons';
import { EYEBROW_CLASS, InlineNotice } from '@/components/ui/kit';
import type { ValorantAgentOption } from '@/hooks/useScoreboardOcr';
import type { OcrDraft, OcrDraftPlayer, OcrStatKey, TeamSlot } from '@/types/scoreboardOcr';
import { ScoreboardOcrRow } from './ScoreboardOcrRow';
import { REVIEW_STATS } from './reviewStats';
import { ScoreboardOcrScoreHeader } from './ScoreboardOcrScoreHeader';

/** Warnings that are already visible as row highlights are not repeated in the summary. */
const ROW_LEVEL = new Set(['NAME_UNMATCHED', 'AGENT_UNCERTAIN', 'LOW_CONFIDENCE', 'SIDE_UNKNOWN']);

interface Props {
  draft: OcrDraft;
  teamNames: Record<TeamSlot, string>;
  agents: ValorantAgentOption[];
  errors: string[];
  submitting: boolean;
  onScoreChange: (team: TeamSlot, value: number | null) => void;
  onPlayerChange: (key: string, patch: { team?: TeamSlot; name?: string; agentId?: string | null; stat?: [OcrStatKey, number | null] }) => void;
  onSubmit: () => void;
  onManual: () => void;
}

function TeamGroup({ title, players, ...rest }: { title: string; players: OcrDraftPlayer[] } & Pick<Props, 'teamNames' | 'agents' | 'onPlayerChange'> & { offset: number }) {
  if (players.length === 0) return null;
  return (
    <section aria-label={title} className="border border-white/[0.07] bg-black/20 px-3 py-2">
      <div className="hidden grid-cols-[7.5rem_8.5rem_minmax(0,1fr)_repeat(5,3.6rem)] gap-2 pb-1 sm:grid">
        <span className={EYEBROW_CLASS}>{title}</span>
        <span className={EYEBROW_CLASS}>Agent</span>
        <span className={EYEBROW_CLASS}>Player</span>
        {REVIEW_STATS.map((s) => <span key={s.key} className={`${EYEBROW_CLASS} text-center`}>{s.label}</span>)}
      </div>
      <p className={`${EYEBROW_CLASS} pb-1 sm:hidden`}>{title}</p>
      <div className="grid grid-cols-5 gap-2 pb-1 sm:hidden" aria-hidden>
        {REVIEW_STATS.map((s) => <span key={s.key} className={`${EYEBROW_CLASS} text-center`}>{s.label}</span>)}
      </div>
      {players.map((player, i) => (
        <ScoreboardOcrRow
          key={player.key}
          player={player}
          index={rest.offset + i}
          teamNames={rest.teamNames}
          agents={rest.agents}
          onChange={(patch) => rest.onPlayerChange(player.key, patch)}
        />
      ))}
    </section>
  );
}

export function ScoreboardOcrReview({ draft, teamNames, agents, errors, submitting, onScoreChange, onPlayerChange, onSubmit, onManual }: Props) {
  const groups = useMemo(() => ({
    unassigned: draft.players.filter((p) => p.team === null),
    team1: draft.players.filter((p) => p.team === 'team1'),
    team2: draft.players.filter((p) => p.team === 'team2'),
  }), [draft.players]);
  const flaggedCount = draft.players.reduce((sum, p) => sum + p.uncertain.length, 0) + (draft.uncertainScore ? 1 : 0);
  const summary = draft.warnings.filter((w) => !ROW_LEVEL.has(w.code));
  const shared = { teamNames, agents, onPlayerChange };

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
          <p className="text-[13px] text-zinc-400">
            {flaggedCount > 0
              ? `${flaggedCount} ${flaggedCount === 1 ? 'value is' : 'values are'} outlined in amber. Check them against the screenshot.`
              : 'Everything read cleanly. Give it one look before sending.'}
          </p>
          {summary.map((w) => <InlineNotice key={w.code} tone="warning">{w.message}</InlineNotice>)}
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
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <GhostButton type="button" onClick={onManual} disabled={submitting}>Enter result manually</GhostButton>
          <CtaButton type="button" onClick={onSubmit} disabled={submitting}>
            {submitting ? 'Sending…' : 'Send to opponent to confirm'}
          </CtaButton>
        </div>
      </div>
    </div>
  );
}
