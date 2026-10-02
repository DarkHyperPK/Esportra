import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { BracketMatch } from '@/types/bracketTypes';
import {
    bracketChampion,
    computeBracketLayout,
    DEFAULT_BRACKET_DIMS,
    rawMatchId,
    teamRoute,
    type BracketColumn,
    type BracketDims,
} from '@/services/bracket/bracketLayout';
import { ReadOnlyMatchCard, type MatchRouteState } from './ReadOnlyMatchCard';
import { BracketColumnHeader, BracketSectionTitle } from './BracketColumnHeader';
import { BracketChampionSeat } from './BracketChampionSeat';
import { BracketConnectors } from './BracketConnectors';

interface BracketRendererProps {
    matches: BracketMatch[];
    activeFilter: { type: string; round?: number };
    customFilterPredicate?: (match: BracketMatch) => boolean;
    onMatchClick?: (match: BracketMatch) => void;
    hasResultsMap?: Record<string, unknown[]>;
    hasProofsMap?: Record<string, string[]>;
    cardWidth?: number;
    cardHeight?: number;
    roundGap?: number;
    matchGap?: number;
    disableAnimations?: boolean;
    /** Kept for callers; the layout reads the format from the matches themselves. */
    isSingleElimination?: boolean;
    /** The found or hovered team: its route lights up through the tree. */
    hoveredTeamId?: string | null;
    onTeamHover?: (teamId: string | null) => void;
    /** Outlines the match being edited. */
    selectedMatchId?: string | null;
}

const PAD = 24;

const matchesFilter = (match: BracketMatch, filter: BracketRendererProps['activeFilter']) => {
    if (filter.type === 'all') return true;
    if (filter.type === 'final') return match.bracketSide === 'final';
    const side = match.bracketSide === 'losers' ? 'losers' : 'winners';
    return side === filter.type && match.round === filter.round && match.bracketSide !== 'final';
};

function routeStateOf(id: string, teamId: string | null | undefined, route: ReturnType<typeof teamRoute>): MatchRouteState | null {
    if (!teamId) return null;
    if (route.played.has(id)) return 'played';
    if (route.ahead.has(id)) return 'ahead';
    return 'off';
}

/**
 * An elimination bracket as a broadcast tree: named rounds with progress, quiet
 * connectors that brighten as matches are decided, a found team's route lit in
 * rose, and the champion's seat at the end. A round filter shows that round as a list.
 */
export const BracketRenderer: React.FC<BracketRendererProps> = ({
    matches, activeFilter, customFilterPredicate, onMatchClick, hasResultsMap = {}, hasProofsMap = {},
    cardWidth, cardHeight, roundGap, matchGap, disableAnimations = false, hoveredTeamId = null, onTeamHover, selectedMatchId = null,
}) => {
    const dims: BracketDims = useMemo(() => ({
        ...DEFAULT_BRACKET_DIMS,
        cardWidth: cardWidth ?? DEFAULT_BRACKET_DIMS.cardWidth,
        cardHeight: cardHeight ?? DEFAULT_BRACKET_DIMS.cardHeight,
        roundGap: roundGap ?? DEFAULT_BRACKET_DIMS.roundGap,
        matchGap: matchGap ?? DEFAULT_BRACKET_DIMS.matchGap,
        championWidth: cardWidth ?? DEFAULT_BRACKET_DIMS.championWidth,
    }), [cardWidth, cardHeight, roundGap, matchGap]);
    const layout = useMemo(() => computeBracketLayout(matches, dims), [matches, dims]);
    const route = useMemo(() => teamRoute(matches, hoveredTeamId), [matches, hoveredTeamId]);
    const champion = useMemo(() => bracketChampion(matches, layout.champion?.sourceId), [matches, layout.champion?.sourceId]);
    const doubleElimination = layout.sections.length > 0;
    const columnIndex = useMemo(() => new Map(layout.columns.map((column) => [column.x, column])), [layout.columns]);

    const renderCard = (match: BracketMatch, position?: { x: number; y: number }) => (
        <ReadOnlyMatchCard
            match={match}
            x={position ? 0 : undefined}
            y={position ? 0 : undefined}
            width={dims.cardWidth}
            height={dims.cardHeight}
            className={position ? undefined : 'w-full'}
            onClick={onMatchClick ? () => onMatchClick(match) : undefined}
            hasAutomatedResults={(hasResultsMap[rawMatchId(String(match.id))]?.length ?? 0) > 0}
            hasProofs={(hasProofsMap[rawMatchId(String(match.id))]?.length ?? 0) > 0}
            hoveredTeamId={hoveredTeamId}
            onTeamHover={onTeamHover}
            isDoubleElimination={doubleElimination}
            routeState={routeStateOf(match.id, hoveredTeamId, route)}
            selected={selectedMatchId === match.id}
        />
    );

    if (activeFilter.type !== 'all') {
        const visible = matches.filter((match) => matchesFilter(match, activeFilter)).sort((a, b) => a.matchNumber - b.matchNumber);
        const column: BracketColumn | undefined = layout.columns.find((c) =>
            activeFilter.type === 'final' ? c.side === 'final' : c.side === activeFilter.type && c.round === activeFilter.round);
        return (
            <div className="p-6" onMouseLeave={() => onTeamHover?.(null)}>
                {column ? <div className="relative mb-5 h-12" style={{ width: dims.cardWidth }}><BracketColumnHeader column={{ ...column, x: 0, y: 0 }} width={dims.cardWidth} /></div> : null}
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${dims.cardWidth}px, 1fr))` }}>
                    {visible.map((match) => <div key={match.id}>{renderCard(match)}</div>)}
                </div>
            </div>
        );
    }

    return (
        <div
            className="relative"
            style={{ width: layout.width + PAD * 2, height: layout.height + PAD * 2, minWidth: '100%' }}
            onMouseLeave={() => onTeamHover?.(null)}
        >
            <div className="absolute" style={{ left: PAD, top: PAD, width: layout.width, height: layout.height }}>
                <BracketConnectors
                    matches={matches}
                    layout={layout}
                    dims={dims}
                    teamId={hoveredTeamId}
                    route={route}
                    championIsTeam={Boolean(hoveredTeamId && champion?.id === hoveredTeamId)}
                />
                {layout.sections.map((section) => <BracketSectionTitle key={section.side} side={section.side} y={section.y} />)}
                {layout.columns.map((column) => <BracketColumnHeader key={column.key} column={column} width={dims.cardWidth} />)}
                {matches.map((match) => {
                    const position = layout.positions[match.id];
                    if (!position || (customFilterPredicate && !customFilterPredicate(match))) return null;
                    const column = [...columnIndex.keys()].indexOf(position.x);
                    const style = { position: 'absolute' as const, left: position.x, top: position.y, width: dims.cardWidth, height: dims.cardHeight };
                    return disableAnimations ? (
                        <div key={match.id} style={style}>{renderCard(match, position)}</div>
                    ) : (
                        <motion.div
                            key={match.id}
                            style={style}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1], delay: Math.max(0, column) * 0.04 }}
                        >
                            {renderCard(match, position)}
                        </motion.div>
                    );
                })}
                {layout.champion ? (
                    <BracketChampionSeat
                        champion={champion}
                        x={layout.champion.x}
                        y={layout.champion.y}
                        width={dims.championWidth}
                        height={dims.championHeight}
                        lit={Boolean(hoveredTeamId) && (champion?.id === hoveredTeamId
                            || (route.alive && (route.ahead.has(layout.champion.sourceId) || route.played.has(layout.champion.sourceId))))}
                    />
                ) : null}
            </div>
        </div>
    );
};

export default BracketRenderer;
