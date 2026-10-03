import { cn } from '@/lib/utils';
import type { ValorantAgentOption } from '@/hooks/useScoreboardOcr';
import type { OcrDraftPlayer, OcrStatKey, TeamSlot } from '@/types/scoreboardOcr';
import { REVIEW_STATS } from './reviewStats';

const CELL = 'h-9 rounded-none border border-white/10 bg-black/40 px-2 text-sm text-white outline-none transition-colors hover:border-white/20 focus-visible:border-rose-400/70';
const FLAG = 'border-amber-400/70 bg-amber-400/[0.06]';

interface Props {
  player: OcrDraftPlayer;
  index: number;
  teamNames: Record<TeamSlot, string>;
  agents: ValorantAgentOption[];
  onChange: (patch: { team?: TeamSlot; name?: string; agentId?: string | null; stat?: [OcrStatKey, number | null] }) => void;
}

/** One editable scoreboard line. Amber outline = the reader was unsure; it clears once edited. */
export function ScoreboardOcrRow({ player, index, teamNames, agents, onChange }: Props) {
  const flagged = (field: string) => player.uncertain.some((f) => f === field);
  const rowLabel = player.name || `Player ${index + 1}`;
  return (
    <div className="grid grid-cols-2 gap-2 border-b border-white/[0.06] py-2 last:border-b-0 sm:grid-cols-[7.5rem_8.5rem_minmax(0,1fr)_repeat(5,3.6rem)] sm:items-center">
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
        value={player.agentId ?? ''}
        onChange={(event) => onChange({ agentId: event.target.value || null })}
        className={cn(CELL, flagged('agent') && FLAG, '[color-scheme:dark]')}
      >
        <option value="">Unknown agent</option>
        {agents.map((agent) => (
          <option key={agent.uuid} value={agent.uuid}>{agent.name}</option>
        ))}
      </select>
      <input
        aria-label={`Player ${index + 1} name`}
        value={player.name}
        maxLength={40}
        onChange={(event) => onChange({ name: event.target.value })}
        className={cn(CELL, 'col-span-2 font-medium sm:col-span-1', flagged('name') && FLAG)}
      />
      <div className="col-span-2 grid grid-cols-5 gap-2 sm:contents">
        {REVIEW_STATS.map(({ key, label, title }) => (
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
