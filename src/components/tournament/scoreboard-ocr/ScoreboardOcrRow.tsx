import { cn } from '@/lib/utils';
import type { ValorantAgentOption } from '@/hooks/useScoreboardOcr';
import type { OcrDraftPlayer, OcrStatKey, TeamSlot, VerificationStatus } from '@/types/scoreboardOcr';
import { desktopGridClass, mobileStatsGridClass, type ReviewStat } from './reviewStats';
import { VerificationBadge } from './VerificationBadge';

const CELL = 'h-9 rounded-none border border-white/10 bg-black/40 px-2 text-sm text-white outline-none transition-colors hover:border-white/20 focus-visible:border-rose-400/70';
const FLAG = 'border-amber-400/70 bg-amber-400/[0.06]';

interface Props {
  player: OcrDraftPlayer;
  index: number;
  teamNames: Record<TeamSlot, string>;
  agents: ValorantAgentOption[];
  stats: ReviewStat[];
  /** Roster check for this row, when the API returned one. */
  verification?: VerificationStatus | null;
  onChange: (patch: RowPatch) => void;
}

export type RowPatch = { team?: TeamSlot; name?: string; agentId?: string | null; agentName?: string | null; stat?: [OcrStatKey, number | null] };

/** valorant-api agents by uuid; agents it doesn't list yet (read from the screenshot) by name. */
function agentValue(player: OcrDraftPlayer): string {
  if (player.agentId) return player.agentId;
  return player.agentName ? `name:${player.agentName}` : '';
}

/** One editable scoreboard line. Amber outline = the reader was unsure; it clears once edited. */
export function ScoreboardOcrRow({ player, index, teamNames, agents, stats, verification, onChange }: Props) {
  const flagged = (field: string) => player.uncertain.some((f) => f === field);
  const rowLabel = player.name || `Player ${index + 1}`;
  return (
    <div className={cn('grid grid-cols-2 gap-2 border-b border-white/[0.06] py-2 last:border-b-0 sm:items-center', desktopGridClass(stats.length))}>
      <select
        aria-label={`${rowLabel} team`}
        value={player.team ?? ''}
        onChange={(event) => onChange({ team: event.target.value === 'team2' ? 'team2' : 'team1' })}
        className={cn(CELL, flagged('team') && FLAG, '[color-scheme:dark]')}
      >
        <option value="" disabled>Pick team</option>
        <option value="team1">{teamNames.team1}</option>
        <option value="team2">{teamNames.team2}</option>
      </select>
      <select
        aria-label={`${rowLabel} agent`}
        value={agentValue(player)}
        onChange={(event) => {
          const value = event.target.value;
          if (value.startsWith('name:')) onChange({ agentId: null, agentName: value.slice(5) });
          else onChange({ agentId: value || null, agentName: agents.find((a) => a.uuid === value)?.name ?? null });
        }}
        className={cn(CELL, flagged('agent') && FLAG, '[color-scheme:dark]')}
      >
        <option value="">Unknown agent</option>
        {!player.agentId && player.agentName ? <option value={`name:${player.agentName}`}>{player.agentName}</option> : null}
        {agents.map((agent) => (
          <option key={agent.uuid} value={agent.uuid}>{agent.name}</option>
        ))}
      </select>
      <div className="col-span-2 flex min-w-0 flex-col gap-1 sm:col-span-1">
        <input
          aria-label={`Player ${index + 1} name`}
          value={player.name}
          maxLength={40}
          dir="auto"
          placeholder="Name not readable — type it"
          onChange={(event) => onChange({ name: event.target.value })}
          className={cn(CELL, 'w-full font-medium', flagged('name') && FLAG)}
        />
        {verification ? <VerificationBadge status={verification} /> : null}
      </div>
      <div className={cn('col-span-2 grid gap-2 sm:contents', mobileStatsGridClass(stats.length))}>
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
            className={cn(CELL, 'text-center tabular-nums', flagged(key) && FLAG)}
          />
        ))}
      </div>
    </div>
  );
}
