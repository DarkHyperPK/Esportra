import { Trophy } from 'lucide-react';
import type { BracketTeam } from '@/types/bracketTypes';
import { cn } from '@/lib/utils';
import { TeamCrest } from './TeamCrest';
import { championGlow } from './teamTint';

type Props = {
    champion: BracketTeam | null;
    x: number;
    y: number;
    width: number;
    height: number;
    /** The found or hovered team is champion, or its road leads here. */
    lit: boolean;
};

/** The 45° notch reserved for the champion moment. */
const NOTCH = 'polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%)';

/**
 * The seat at the end of the tree. Empty and dashed until the last match is
 * decided; then the champion takes it: their colour glows behind their crest,
 * their name at the largest size on the canvas, the rose underline.
 */
export const BracketChampionSeat = ({ champion, x, y, width, height, lit }: Props) => {
    if (!champion) {
        return (
            <div
                style={{ position: 'absolute', left: x, top: y, width, height }}
                className={cn(
                    'flex flex-col justify-between border border-dashed bg-black/30 p-4 transition-colors',
                    lit ? 'border-rose-500/70' : 'border-white/20',
                )}
                aria-label="Champion to be decided"
            >
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-400">Champion</span>
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center bg-white/[0.05]">
                        <Trophy aria-hidden className="h-4 w-4 text-zinc-400" />
                    </span>
                    <div>
                        <p className="font-heading text-[17px] font-bold leading-none text-zinc-300">To be decided</p>
                        <p className="mt-1.5 text-[12px] text-zinc-500">Winner of the final takes the seat.</p>
                    </div>
                </div>
                <span />
            </div>
        );
    }

    return (
        <div
            style={{
                position: 'absolute', left: x, top: y, width, height, clipPath: NOTCH,
                backgroundImage: `radial-gradient(circle at 22% 55%, ${championGlow(champion.id || champion.name)}, transparent 62%), linear-gradient(180deg, #22222a 0%, #17171c 100%)`,
            }}
            className={cn('flex flex-col justify-between p-4', lit ? 'shadow-[inset_0_0_0_1.5px_rgba(244,63,94,0.85)]' : 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]')}
            aria-label={`Champion: ${champion.name}`}
        >
            <div className="flex items-center gap-2">
                <Trophy aria-hidden className="h-3.5 w-3.5 text-white" />
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-200">Champion</span>
            </div>
            <div className="flex min-w-0 items-center gap-3">
                <TeamCrest name={champion.name} logoUrl={champion.logo_url} tintKey={champion.id} className="h-12 w-12 text-[13px]" />
                <div className="min-w-0">
                    <p className="truncate font-heading text-[24px] font-black leading-none tracking-tight text-white">{champion.name}</p>
                    <span aria-hidden className="mt-2 block h-0.5 w-12 bg-rose-500" />
                </div>
            </div>
            <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                {champion.seed ? `Seed ${champion.seed}` : ' '}
            </span>
        </div>
    );
};

export default BracketChampionSeat;
