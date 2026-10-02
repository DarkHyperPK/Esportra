import type { ReactNode } from 'react';
import type { BracketTeam } from '@/types/bracketTypes';

type Props = {
    played: number;
    total: number;
    live: number;
    teams: number;
    champion: BracketTeam | null;
};

const Tile = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="min-w-0 bg-[linear-gradient(180deg,#18181d_0%,#121216_100%)] px-4 py-3">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">{label}</p>
        <div className="mt-1.5 flex min-w-0 items-baseline gap-1.5">{children}</div>
    </div>
);

/** The bracket at a glance: how far it has run, what is live, who is in it and who won. */
export const BracketSummaryStrip = ({ played, total, live, teams, champion }: Props) => (
    <div className="grid grid-cols-2 gap-px bg-white/[0.06] md:grid-cols-4">
        <Tile label="Played">
            <span className="font-heading text-[22px] font-black leading-none tabular-nums text-white">{played}</span>
            <span className="font-heading text-[13px] font-bold tabular-nums text-zinc-500">/ {total}</span>
        </Tile>
        <Tile label="Live">
            {live > 0 ? <span aria-hidden className="h-2 w-2 self-center rounded-full bg-rose-500" /> : null}
            <span className={live > 0 ? 'font-heading text-[22px] font-black leading-none tabular-nums text-white' : 'font-heading text-[22px] font-black leading-none tabular-nums text-zinc-600'}>
                {live}
            </span>
            <span className="text-[12px] text-zinc-500">{live === 1 ? 'match' : 'matches'}</span>
        </Tile>
        <Tile label="Teams">
            <span className="font-heading text-[22px] font-black leading-none tabular-nums text-white">{teams}</span>
        </Tile>
        <Tile label="Champion">
            {champion ? (
                <span className="truncate font-heading text-[18px] font-black leading-none text-white">{champion.name}</span>
            ) : (
                <span className="font-heading text-[15px] font-bold leading-none text-zinc-600">To be decided</span>
            )}
        </Tile>
    </div>
);

export default BracketSummaryStrip;
