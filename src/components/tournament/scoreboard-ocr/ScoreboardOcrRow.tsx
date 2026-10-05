import { cn } from '@/lib/utils';
import type { RowCheck, AgentChoice } from '@/services/scoreboardOcr';
import type { OcrDraftPlayer, OcrStatKey, TeamSlot } from '@/types/scoreboardOcr';
import { desktopGridClass, mobileStatsGridClass, type ReviewStat } from './reviewStats';
import { VerificationBadge } from './VerificationBadge';
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
  /** Roster (and Riot) check for this row, when the API returned one. */
  verification?: RowCheck | null;
  onChange: (patch: RowPatch) => void;
}

export type RowPatch = { team?: TeamSlot; name?: string; agentId?: string | null; agentName?: string | null; stat?: [OcrStatKey, number | null] };

/**
 * One dense scoreboard line: agent portrait, name, stats, move. Amber = the reader was unsure; it clears
 * once edited. On phones the stats wrap under the name.
 */
export function ScoreboardOcrRow({ player, index, teamNames, teamLogos, agents, stats, verification, onChange }: Props) {
  const flagged = (field: string) => player.uncertain.some((f) => f === field);
  const rowLabel = player.name || `Player ${index + 1}`;
  return (
    <div className={cn('grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-x-1.5 gap-y-1 border-b border-white/[0.05] px-2 py-1 last:border-b-0', desktopGridClass(stats.length))}>
      <AgentPicker
        agentId={player.agentId}
        agentName={player.agentName}
        choices={agents}
        uncertain={flagged('agent')}
        playerLabel={rowLabel}
        onPick={(agentId, agentName) => onChange({ agentId, agentName })}
      />
      <div className="flex min-w-0 items-center gap-1.5">
        {verification ? <VerificationBadge compact status={verification.status} riotStatus={verification.riotStatus} /> : null}
        <input
          aria-label={`Player ${index + 1} name`}
          value={player.name}
          maxLength={40}
          dir="auto"
          placeholder="Name not readable — type it"
          onChange={(event) => onChange({ name: event.target.value })}
          className={cn(CELL, 'min-w-0 flex-1 px-2 font-medium', flagged('name') ? FLAG : QUIET)}
        />
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
