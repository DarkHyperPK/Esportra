import { useMemo } from 'react';
import type { BracketMatch } from '@/types/bracketTypes';
import { computeBracketLayout, rawMatchId } from '@/services/bracket/bracketLayout';
import { ReadOnlyMatchCard } from './ReadOnlyMatchCard';
import type { FilterState } from './BracketSidebarFilter';

type Props = {
    matches: BracketMatch[];
    activeFilter: FilterState;
    /** When set, only this team's matches are listed. */
    foundTeamId: string | null;
    onMatchClick?: (match: BracketMatch) => void;
    hasResultsMap?: Record<string, unknown[]>;
};

const sideKey = (match: BracketMatch) => (match.bracketSide === 'losers' ? 'losers' : match.bracketSide === 'final' || match.bracketSide === 'reset' ? 'final' : 'winners');

/** The bracket as a list, round by round, under the same names as the tree. Default on phones. */
export const BracketMatchList = ({ matches, activeFilter, foundTeamId, onMatchClick, hasResultsMap = {} }: Props) => {
    const layout = useMemo(() => computeBracketLayout(matches), [matches]);
    const doubleElimination = layout.sections.length > 0;

    const groups = useMemo(() => layout.columns
        .filter((column) => {
            if (activeFilter.type === 'all') return true;
            if (activeFilter.type === 'final') return column.side === 'final';
            return column.side === activeFilter.type && column.round === activeFilter.round;
        })
        .map((column) => ({
            column,
            list: matches
                .filter((match) => sideKey(match) === column.side && match.round === column.round)
                .filter((match) => !foundTeamId || match.team1?.id === foundTeamId || match.team2?.id === foundTeamId)
                .sort((a, b) => a.matchNumber - b.matchNumber),
        }))
        .filter((group) => group.list.length > 0), [activeFilter, foundTeamId, layout.columns, matches]);

    if (groups.length === 0) {
        return <p className="px-5 py-16 text-center text-sm text-zinc-500">{foundTeamId ? 'No matches for this team in this round.' : 'No matches in this round yet.'}</p>;
    }

    return (
        <div className="space-y-10 px-4 py-6 sm:px-5">
            {groups.map(({ column, list }) => (
                <section key={column.key} aria-label={column.label}>
                    <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-white/[0.07] pb-2.5">
                        <h3 className="font-heading text-[16px] font-bold text-white">{column.label}</h3>
                        <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                            {[column.bestOf ? `BO${column.bestOf}` : null, `${column.played}/${column.total} played`, column.live ? `${column.live} live` : null].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {list.map((match) => (
                            <ReadOnlyMatchCard
                                key={match.id}
                                match={match}
                                className="w-full"
                                onClick={onMatchClick ? () => onMatchClick(match) : undefined}
                                hasAutomatedResults={(hasResultsMap[rawMatchId(String(match.id))]?.length ?? 0) > 0}
                                hoveredTeamId={foundTeamId}
                                isDoubleElimination={doubleElimination}
                                routeState={null}
                            />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
};

export default BracketMatchList;
