import { ArrowLeftRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import EntityAvatar from '@/components/ui/EntityAvatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { TeamSlot } from '@/types/scoreboardOcr';

interface Props {
  team: TeamSlot | null;
  teamNames: Record<TeamSlot, string>;
  teamLogos?: Partial<Record<TeamSlot, string>>;
  playerLabel: string;
  uncertain: boolean;
  onMove: (team: TeamSlot) => void;
}

const ICON_BUTTON = 'flex h-8 w-8 items-center justify-center border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40';

/** Moves a row to the other team; a row with no team gets a choice of both. */
export function TeamMoveButton({ team, teamNames, teamLogos, playerLabel, uncertain, onMove }: Props) {
  if (team) {
    const other: TeamSlot = team === 'team1' ? 'team2' : 'team1';
    return (
      <button
        type="button"
        onClick={() => onMove(other)}
        aria-label={`Move ${playerLabel} to ${teamNames[other]}`}
        title={`Move to ${teamNames[other]}`}
        className={cn(ICON_BUTTON, uncertain ? 'border-amber-400/70 text-amber-300' : 'border-transparent text-zinc-600 hover:border-white/15 hover:text-zinc-200')}
      >
        <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
      </button>
    );
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Pick a team for ${playerLabel}`} className={cn(ICON_BUTTON, 'border-amber-400/70 text-amber-300')}>
          <Users className="h-3.5 w-3.5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 rounded-none border-white/10 bg-zinc-950 p-1">
        {(['team1', 'team2'] as const).map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => onMove(slot)}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none"
          >
            <EntityAvatar src={teamLogos?.[slot]} name={teamNames[slot]} type="team" size="h-5 w-5" className="rounded-none" />
            <span className="truncate">Put in {teamNames[slot]}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
