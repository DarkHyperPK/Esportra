import { cn } from '@/lib/utils';

type Props = {
    teams: number;
    slots: number;
    duplicates: string[];
};

/** How full the bracket is: teams against slots, with byes and problems spelled out. */
export const TeamSlotsMeter = ({ teams, slots, duplicates }: Props) => {
    const over = teams > slots;
    const fill = Math.min(1, slots > 0 ? teams / slots : 0);
    const byes = Math.max(0, slots - teams);
    const message = over
        ? `${teams - slots} too many. Remove teams or pick a bigger size.`
        : duplicates.length > 0
            ? `Listed twice: ${duplicates.join(', ')}`
            : teams === 0
                ? 'Empty bracket: every slot starts as TBD.'
                : teams === 1
                    ? 'Add one more team, or clear the list for an empty bracket.'
                    : byes > 0
                        ? `${byes} ${byes === 1 ? 'bye' : 'byes'} in round one. Seeds follow the list order.`
                        : 'Full bracket. Seeds follow the list order.';
    const problem = over || duplicates.length > 0 || teams === 1;

    return (
        <div className="space-y-2" aria-live="polite">
            <div className="flex items-baseline justify-between">
                <span className="font-heading text-[15px] font-extrabold tabular-nums text-white">
                    {teams}
                    <span className="ml-1 text-[12px] font-bold text-zinc-500">/ {slots} slots</span>
                </span>
            </div>
            <div aria-hidden className="h-0.5 w-full bg-white/[0.08]">
                <div className={cn('h-0.5 transition-[width] duration-200', over ? 'bg-red-400' : 'bg-white/60')} style={{ width: `${fill * 100}%` }} />
            </div>
            <p className={cn('text-xs leading-relaxed', problem ? 'text-red-300' : 'text-zinc-500')}>{message}</p>
        </div>
    );
};

export default TeamSlotsMeter;
