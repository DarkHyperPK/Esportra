import { useMemo } from 'react';
import { Image as ImageIcon, ScanSearch } from 'lucide-react';
import { CtaButton, GhostButton } from '@/components/ui/app-buttons';
import { InlineNotice } from '@/components/ui/kit';
import type { ValorantAgentOption } from '@/hooks/useScoreboardOcr';
import { agentChoices, badgeFor, reviewCheck } from '@/services/scoreboardOcr';
import { BUNDLED_AGENT_NAMES } from '@/components/tournament/fullScoreboardConstants';
import type { OcrDraft, OcrDraftPlayer, OcrVerification, TeamSlot } from '@/types/scoreboardOcr';
import { ScoreboardOcrRow, type RowPatch } from './ScoreboardOcrRow';
import { visibleStats, type ReviewStat } from './reviewStats';
import { ScoreboardOcrScoreHeader } from './ScoreboardOcrScoreHeader';
import { ReviewSourceNotice } from './ReviewSourceNotice';
import { TeamGroupHeader } from './TeamGroupHeader';
import type { AgentChoice } from '@/services/scoreboardOcr';

interface Props {
  draft: OcrDraft;
  teamNames: Record<TeamSlot, string>;
  teamLogos?: Partial<Record<TeamSlot, string>>;
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

interface GroupProps {
  slot: TeamSlot | null;
  players: OcrDraftPlayer[];
  offset: number;
  stats: ReviewStat[];
  choices: AgentChoice[];
  draft: OcrDraft;
  teamNames: Record<TeamSlot, string>;
  teamLogos?: Partial<Record<TeamSlot, string>>;
  verification?: OcrVerification | null;
  onPlayerChange: Props['onPlayerChange'];
}

function TeamGroup({ slot, players, offset, stats, choices, draft, teamNames, teamLogos, verification, onPlayerChange }: GroupProps) {
  if (players.length === 0) return null;
  const rounds = slot === 'team1' ? draft.team1Score : slot === 'team2' ? draft.team2Score : null;
  const other = slot === 'team1' ? draft.team2Score : draft.team1Score;
  return (
    <section aria-label={slot ? teamNames[slot] : 'Needs a team'} className="border border-white/[0.07] bg-black/20">
      <TeamGroupHeader
        name={slot ? teamNames[slot] : 'Needs a team'}
        logo={slot ? teamLogos?.[slot] : undefined}
        rounds={rounds}
        leading={rounds != null && other != null && rounds > other}
        stats={stats}
        unassigned={slot === null}
      />
      {players.map((player, i) => (
        <ScoreboardOcrRow
          key={player.key}
          player={player}
          index={offset + i}
          teamNames={teamNames}
          teamLogos={teamLogos}
          agents={choices}
          stats={stats}
          verification={reviewCheck(player, verification?.players.find((v) => v.index === rowIndex(player)))}
          onChange={(patch) => onPlayerChange(player.key, patch)}
        />
      ))}
    </section>
  );
}

/** Rows whose name needs a look (not on a roster, other team, changed…), for one line above the table. */
function namesToCheck(players: OcrDraftPlayer[], verification?: OcrVerification | null): number {
  return players.filter((p) => {
    const check = reviewCheck(p, verification?.players.find((v) => v.index === rowIndex(p)));
    return check !== null && badgeFor(check).tone === 'check';
  }).length;
}

export function ScoreboardOcrReview(props: Props) {
  const { draft, teamNames, teamLogos, agents, errors, submitting, onScoreChange, onPlayerChange, onSubmit, onManual, readOnly = false, verification } = props;
  const groups = useMemo(() => ({
    unassigned: draft.players.filter((p) => p.team === null),
    team1: draft.players.filter((p) => p.team === 'team1'),
    team2: draft.players.filter((p) => p.team === 'team2'),
  }), [draft.players]);
  const stats = useMemo(() => visibleStats(draft.columns), [draft.columns]);
  const choices = useMemo(() => agentChoices(agents, BUNDLED_AGENT_NAMES), [agents]);
  const toCheck = namesToCheck(draft.players, verification);
  const hardToRead = draft.players.reduce((sum, p) => sum + p.uncertain.length, 0) + (draft.uncertainScore ? 1 : 0);
  const shared = { stats, choices, draft, teamNames, teamLogos, verification, onPlayerChange };

  return (
    <div className="space-y-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
      <div className="grid items-start gap-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
        <a
          href={draft.screenshotUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative hidden aspect-video sm:block overflow-hidden border border-white/[0.07] bg-black/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400"
        >
          <img src={draft.screenshotUrl} alt="Uploaded scoreboard screenshot" className="h-full w-full object-cover transition-opacity group-hover:opacity-80" loading="lazy" />
          <span className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-300">Open full size</span>
        </a>
        <div className="space-y-2">
          <ScoreboardOcrScoreHeader
            team1Name={teamNames.team1}
            team2Name={teamNames.team2}
            teamLogos={teamLogos}
            team1Score={draft.team1Score}
            team2Score={draft.team2Score}
            mapName={draft.mapName}
            uncertain={draft.uncertainScore}
            onChange={onScoreChange}
          />
        </div>
      </div>
      <div className="space-y-1">
        <ReviewSourceNotice hardToRead={hardToRead} />
        <a
          href={draft.screenshotUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] text-zinc-300 underline-offset-4 hover:underline sm:hidden"
        >
          <ImageIcon className="h-4 w-4 text-zinc-500" aria-hidden />
          View your screenshot
        </a>
        {toCheck > 0 ? (
          <p className="flex items-center gap-2 text-[13px] text-zinc-400">
            <ScanSearch className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
            {toCheck === 1 ? '1 name is marked for a look.' : `${toCheck} names are marked for a look.`} Tap the icon next to a name to see why.
          </p>
        ) : null}
      </div>
      <TeamGroup slot={null} players={groups.unassigned} offset={0} {...shared} />
      <TeamGroup slot="team1" players={groups.team1} offset={groups.unassigned.length} {...shared} />
      <TeamGroup slot="team2" players={groups.team2} offset={groups.unassigned.length + groups.team1.length} {...shared} />
      {errors.length > 0 && (
        <InlineNotice tone="critical" title="Fix these before sending">
          <ul className="list-disc pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </InlineNotice>
      )}
      {!readOnly && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <GhostButton type="button" onClick={onManual} disabled={submitting}>Enter result manually</GhostButton>
          <CtaButton type="button" onClick={onSubmit} disabled={submitting}>
            {submitting ? 'Sending…' : 'Send to opponent to confirm'}
          </CtaButton>
        </div>
      )}
    </div>
  );
}
