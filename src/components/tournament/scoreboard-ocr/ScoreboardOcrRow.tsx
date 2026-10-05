import { CircleDashed, ScanSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAME_CONFIDENCE_THRESHOLD, reviewTag, type AgentChoice, type ReviewReason } from '@/services/scoreboardOcr';
import type { OcrDraftPlayer, OcrStatKey, TeamSlot } from '@/types/scoreboardOcr';
import { desktopGridClass, mobileStatsGridClass, type ReviewStat } from './reviewStats';
import { AgentPicker } from './AgentPicker';
import { TeamMoveButton } from './TeamMoveButton';

const CELL = 'h-8 w-full rounded-none border bg-white/[0.03] px-1.5 text-sm text-white outline-none transition-colors focus-visible:border-white/40';
const QUIET = 'border-transparent hover:border-white/15';
const FLAG = 'border-amber-400/70 bg-amber-400/[0.08]';

interface Props {
  player: OcrDraftPlayer;
  index: number;
  teamNames: Record<TeamSlot, string>;
  teamLogos?: Partial<Record<TeamSlot, string>>;
  agents: AgentChoice[];
  stats: ReviewStat[];
  /** Why this row needs a look (roster or Riot check); shown as a visible tag. */
  reason?: ReviewReason | null;
  /** True once the captain has confirmed or edited this elimination-matched row. */
  eliminationConfirmed?: boolean;
  /** Called when the captain clicks "confirm" on an elimination-matched row. */
  onConfirmElimination?: () => void;
  onChange: (patch: RowPatch) => void;
}

export type RowPatch = { team?: TeamSlot; name?: string; agentId?: string | null; agentName?: string | null; stat?: [OcrStatKey, number | null] };

/**
 * One dense scoreboard line: agent portrait, name, stats, move. Amber = the reader was unsure; it clears
 * once edited. Rose left border = elimination match (name unreadable); zinc tag = low confidence read.
 * On phones the stats wrap under the name.
 */
export function ScoreboardOcrRow({ player, index, teamNames, teamLogos, agents, stats, reason, eliminationConfirmed, onConfirmElimination, onChange }: Props) {
  const flagged = (field: string) => player.uncertain.some((f) => f === field);
  const rowLabel = player.name || `Player ${index + 1}`;
  const isUnconfirmedElimination = player.rosterMatchMethod === 'elimination' && !eliminationConfirmed;
  const isLowConfidenceRead =
    player.rosterMatchMethod !== 'elimination' &&
    (player.nameConfidence ?? 1) < NAME_CONFIDENCE_THRESHOLD;

  return (
    <div
      className={cn(
        'grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-x-1.5 gap-y-1 border-b border-white/[0.05] px-2 py-1 last:border-b-0',
        desktopGridClass(stats.length),
        isUnconfirmedElimination && 'border-l-2 border-l-rose-500 bg-rose-500/[0.04]',
      )}
    >
      <AgentPicker
        agentId={player.agentId}
        agentName={player.agentName}
        choices={agents}
        uncertain={flagged('agent')}
        playerLabel={rowLabel}
        onPick={(agentId, agentName) => onChange({ agentId, agentName })}
      />
      <div className="flex min-w-0 flex-col gap-y-0.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 sm:flex-nowrap">
          <input
            aria-label={`Player ${index + 1} name`}
            value={player.name}
            maxLength={40}
            dir="auto"
            placeholder="Name not readable — type it"
            onChange={(event) => onChange({ name: event.target.value })}
            className={cn(CELL, 'min-w-0 flex-1 basis-full px-2 font-medium sm:basis-auto', flagged('name') ? FLAG : QUIET)}
          />
          {reason ? (
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-300 sm:px-0">
              <ScanSearch className="h-3 w-3" aria-hidden />
              {reviewTag(reason, player.team, teamNames)}
            </span>
          ) : null}
        </div>
        {isUnconfirmedElimination && (
          <>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-rose-300">
              Not readable
            </span>
            <span className="text-[11px] text-rose-300/70">
              Matched by elimination{' '}&mdash;{' '}
              <button
                type="button"
                className="font-semibold text-white underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40"
                aria-label={`Confirm ${player.name} is correct`}
                onClick={onConfirmElimination}
              >
                confirm
              </button>
              {' '}or fix
            </span>
          </>
        )}
        {isLowConfidenceRead && (
          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-400 sm:px-0">
            <CircleDashed className="h-3 w-3" aria-hidden />
            Check name
          </span>
        )}
      </div>
      <div className={cn('order-2 col-span-3 grid gap-1 sm:order-none sm:contents', mobileStatsGridClass(stats.length))}>
        {stats.map(({ key, label, title }) => (
          <input
            key={key}
            aria-label={`${rowLabel} ${title}`}
            title={title}
            placeholder={label}
            inputMode="numeric"
            value={player.stats[key] ?? ''}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
              onChange({ stat: [key, digits === '' ? null : Number(digits)] });
            }}
            className={cn(CELL, 'px-0.5 text-center text-[13px] tabular-nums sm:px-1.5 sm:text-sm', flagged(key) ? FLAG : QUIET)}
          />
        ))}
      </div>
      <div className="order-1 sm:order-none">
        <TeamMoveButton
          team={player.team}
          teamNames={teamNames}
          teamLogos={teamLogos}
          playerLabel={rowLabel}
          uncertain={flagged('team')}
          onMove={(team) => onChange({ team })}
        />
      </div>
    </div>
  );
}
