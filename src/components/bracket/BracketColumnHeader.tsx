import type { BracketColumn } from '@/services/bracket/bracketLayout';

/** Round name, a mono caption (format · played) and a hairline that fills as the round is played. */
export const BracketColumnHeader = ({ column, width }: { column: BracketColumn; width: number }) => {
    const progress = column.total > 0 ? column.played / column.total : 0;
    const caption = [
        column.bestOf ? `BO${column.bestOf}` : null,
        column.live > 0 ? `${column.live} live` : `${column.played}/${column.total} played`,
    ].filter(Boolean).join(' · ');

    return (
        <div style={{ position: 'absolute', left: column.x, top: column.y, width }}>
            <p className="truncate font-heading text-[15px] font-bold leading-tight text-white">{column.label}</p>
            <p className="mt-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] text-zinc-400">{caption}</p>
            <div aria-hidden className="mt-2.5 h-0.5 w-full bg-white/[0.08]">
                <div className={column.live > 0 ? 'h-0.5 bg-rose-500 transition-[width] duration-300' : 'h-0.5 bg-white/60 transition-[width] duration-300'} style={{ width: `${Math.max(progress, column.live > 0 ? 0.06 : 0) * 100}%` }} />
            </div>
        </div>
    );
};

/** "Upper bracket" / "Lower bracket" title with what it means for the teams in it. */
export const BracketSectionTitle = ({ side, y }: { side: 'winners' | 'losers'; y: number }) => (
    <div style={{ position: 'absolute', left: 0, top: y }} className="flex items-baseline gap-3 whitespace-nowrap">
        <h3 className="font-heading text-[20px] font-extrabold tracking-tight text-white">
            {side === 'winners' ? 'Upper bracket' : 'Lower bracket'}
        </h3>
        <p className="text-[13px] text-zinc-500">
            {side === 'winners' ? 'Lose once and you drop to the lower bracket.' : "Lose here and you're out."}
        </p>
    </div>
);

export default BracketColumnHeader;
