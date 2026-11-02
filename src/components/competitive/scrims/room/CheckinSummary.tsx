import { CheckCircle2 } from 'lucide-react';
import { ROOM_PANEL } from './roomStyles';

/** Once both teams are in, check-in shrinks to one line so the room stays short. */
export function CheckinSummary({ team1, team2 }: { team1: string; team2: string }) {
  return (
    <div className={`${ROOM_PANEL} flex items-center gap-3 !space-y-0 !py-3`}>
      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
      <p className="text-[13px] text-zinc-300">
        <span className="font-semibold text-white">Both teams checked in.</span>{' '}
        <span className="text-zinc-500">{team1} and {team2} are ready.</span>
      </p>
    </div>
  );
}
