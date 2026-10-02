import { Trophy } from 'lucide-react';
import type { BracketTeam } from '@/types/bracketTypes';
import { cn } from '@/lib/utils';
import { TeamCrest } from './TeamCrest';

type Props = {
    champion: BracketTeam | null;
    x: number;
    y: number;
    width: number;
    height: number;
    /** The found or hovered team is champion, or its road leads here. */
    lit: boolean;
};

/** The seat at the end of the tree: empty until the last match is decided, then the champion's name, large. */
export const BracketChampionSeat = ({ champion, x, y, width, height, lit }: Props) => (
    <div
        style={{ position: 'absolute', left: x, top: y, width, height }}
        className={cn(
            'flex flex-col justify-between bg-card p-4 transition-shadow duration-200',
            lit ? 'shadow-[inset_0_0_0_1px_rgba(244,63,94,0.7)]' : 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]',
        )}
        aria-label={champion ? `Champion: ${champion.name}` : 'Champion to be decided'}
    >
        <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">Champion</span>
            <Trophy aria-hidden className={cn('h-3.5 w-3.5', champion ? 'text-white' : 'text-zinc-600')} />
        </div>
        {champion ? (
            <div className="flex min-w-0 items-center gap-3">
                <TeamCrest name={champion.name} logoUrl={champion.logo_url} className="h-10 w-10 text-[12px]" />
                <div className="min-w-0">
                    <p className="truncate font-heading text-[22px] font-black leading-none tracking-tight text-white">{champion.name}</p>
                    <span aria-hidden className="mt-2 block h-0.5 w-10 bg-rose-500" />
                </div>
            </div>
        ) : (
            <div>
                <p className="font-heading text-[17px] font-bold leading-none text-zinc-500">To be decided</p>
                <p className="mt-1.5 text-[12px] text-zinc-600">Winner of the final takes the seat.</p>
            </div>
        )}
        <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
            {champion?.seed ? `Seed ${champion.seed}` : ' '}
        </span>
    </div>
);

export default BracketChampionSeat;
