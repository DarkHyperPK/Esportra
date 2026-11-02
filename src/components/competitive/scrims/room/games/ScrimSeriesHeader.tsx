import { bestOfLongLabel } from '@/services/scrimUtils';
import { ROOM_EYEBROW } from '../roomStyles';

interface Props {
  team1Name: string;
  team2Name: string;
  team1Wins: number;
  team2Wins: number;
  bestOf: number;
  winsNeeded: number;
  nextGameNumber: number | null;
  decided: boolean;
}

/** The running series score and what comes next. */
export function ScrimSeriesHeader({ team1Name, team2Name, team1Wins, team2Wins, bestOf, winsNeeded, nextGameNumber, decided }: Props) {
  return (
    <div className="space-y-2">
      <p className={ROOM_EYEBROW}>Results · {bestOfLongLabel(bestOf)}</p>
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0 flex-1 truncate text-[14px] font-semibold text-white">{team1Name}</p>
        <p className="font-mono text-[26px] font-bold tabular-nums text-white" aria-label={`Series ${team1Wins} to ${team2Wins}`}>
          {team1Wins} <span className="text-white/30">–</span> {team2Wins}
        </p>
        <p className="min-w-0 flex-1 truncate text-right text-[14px] font-semibold text-white">{team2Name}</p>
      </div>
      <p className="text-[12px] text-zinc-500">
        {decided
          ? 'Series complete.'
          : nextGameNumber
            ? `First to ${winsNeeded}. Game ${nextGameNumber} is next — report each map once it is played.`
            : `First to ${winsNeeded}.`}
      </p>
    </div>
  );
}
