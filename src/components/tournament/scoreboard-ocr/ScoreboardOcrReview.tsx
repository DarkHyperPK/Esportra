import { useMemo, useState } from 'react';
import { Image as ImageIcon, ScanSearch } from 'lucide-react';
import { CtaButton, GhostButton } from '@/components/ui/app-buttons';
import { InlineNotice } from '@/components/ui/kit';
import type { ValorantAgentOption } from '@/hooks/useScoreboardOcr';
import { agentChoices, reviewReason, reviewSummary } from '@/services/scoreboardOcr';
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

/** The server's roster/Riot check for a row, as the captain edits it. */
const reasonFor = (player: OcrDraftPlayer, verification?: OcrVerification | null) =>
  reviewReason(player, verification?.players.find((v) => v.index === rowIndex(player)));

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
  confirmedEliminationKeys: ReadonlySet<string>;
  onConfirmElimination: (key: string) => void;
  onPlayerChange: Props['onPlayerChange'];
}

function TeamGroup({ slot, players, offset, stats, choices, draft, teamNames, teamLogos, verification, confirmedEliminationKeys, onConfirmElimination, onPlayerChange }: GroupProps) {
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
          reason={reasonFor(player, verification)}
          eliminationConfirmed={confirmedEliminationKeys.has(player.key)}
          onConfirmElimination={() => onConfirmElimination(player.key)}
          onChange={(patch) => onPlayerChange(player.key, patch)}
        />
      ))}
    </section>
  );
}

export function ScoreboardOcrReview(props: Props) {
  const { draft, teamNames, teamLogos, agents, errors, submitting, onScoreChange, onPlayerChange, onSubmit, onManual, readOnly = false, verification } = props;

  const [confirmedEliminationKeys, setConfirmedEliminationKeys] = useState(() => new Set<string>());

  const handleConfirmElimination = (key: string) => {
    setConfirmedEliminationKeys((prev) => new Set([...prev, key]));
  };

  const handlePlayerChange = (key: string, patch: RowPatch) => {
    if (patch.name !== undefined) {
      const player = draft.players.find((p) => p.key === key);
      if (player?.rosterMatchMethod === 'elimination') {
        setConfirmedEliminationKeys((prev) => new Set([...prev, key]));
      }
    }
    onPlayerChange(key, patch);
  };

  const groups = useMemo(() => ({
    unassigned: draft.players.filter((p) => p.team === null),
    team1: draft.players.filter((p) => p.team === 'team1'),
    team2: draft.players.filter((p) => p.team === 'team2'),
  }), [draft.players]);
  const stats = useMemo(() => visibleStats(draft.columns), [draft.columns]);
  const choices = useMemo(() => agentChoices(agents, BUNDLED_AGENT_NAMES), [agents]);
  const summary = reviewSummary(draft.players.map((p) => reasonFor(p, verification)));
  const hardToRead = draft.players.reduce((sum, p) => sum + p.uncertain.length, 0) + (draft.uncertainScore ? 1 : 0);
  const unconfirmedEliminationCount = draft.players.filter(
    (p) => p.rosterMatchMethod === 'elimination' && !confirmedEliminationKeys.has(p.key),
  ).length;

  const shared = { stats, choices, draft, teamNames, teamLogos, verification, confirmedEliminationKeys, onConfirmElimination: handleConfirmElimination, onPlayerChange: handlePlayerChange };

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
        {summary.map((line) => (
          <p key={line} className="flex items-start gap-2 text-[13px] leading-relaxed text-zinc-300">
            <ScanSearch className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
            {line}
          </p>
        ))}
      </div>
      <TeamGroup slot={null} players={groups.unassigned} offset={0} {...shared} />
      <TeamGroup slot="team1" players={groups.team1} offset={groups.unassigned.length} {...shared} />
      <TeamGroup slot="team2" players={groups.team2} offset={groups.unassigned.length + groups.team1.length} {...shared} />
      {errors.length > 0 && (
        <InlineNotice tone="critical" title="Fix these before sending">
          <ul className="list-disc pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </InlineNotice>
      )}
      {unconfirmedEliminationCount > 0 && (
        <InlineNotice tone="neutral">
          {unconfirmedEliminationCount === 1
            ? "1 name couldn't be read and was filled by guessing. Confirm or correct it above to send."
            : `${unconfirmedEliminationCount} names couldn't be read and were filled by guessing. Confirm or correct them above to send.`}
        </InlineNotice>
      )}
      {!readOnly && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <GhostButton type="button" onClick={onManual} disabled={submitting}>Enter result manually</GhostButton>
          <CtaButton
            type="button"
            onClick={onSubmit}
            disabled={submitting || unconfirmedEliminationCount > 0}
            title={unconfirmedEliminationCount > 0 ? 'Confirm all guessed names first' : undefined}
          >
            {submitting ? 'Sending…' : 'Send to opponent to confirm'}
          </CtaButton>
        </div>
      )}
    </div>
  );
}
