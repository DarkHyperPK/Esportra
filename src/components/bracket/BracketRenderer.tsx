import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReadOnlyMatchCard } from './ReadOnlyMatchCard';
import { BracketMatch } from '@/types/bracketTypes';
interface BracketRendererProps {
    matches: BracketMatch[];
    activeFilter: { type: string; round?: number };
    customFilterPredicate?: (match: BracketMatch) => boolean;
    onMatchClick?: (match: BracketMatch) => void;
    hasResultsMap?: Record<string, any[]>;
    hasProofsMap?: Record<string, string[]>;
    // Optional overrides for layout
    cardWidth?: number;
    cardHeight?: number;
    roundGap?: number;
    matchGap?: number;
    leftPadding?: number;
    headingHeight?: number;
    headingMargin?: number;
    bracketSpacing?: number;
    disableAnimations?: boolean;
    isSingleElimination?: boolean;
}

export const BracketRenderer: React.FC<BracketRendererProps> = ({
    matches,
    activeFilter,
    customFilterPredicate,
    onMatchClick,
    hasResultsMap = {},
    hasProofsMap = {},
    cardWidth = 260,
    cardHeight = 86,
    roundGap = 100,
    matchGap = 30,
    leftPadding = 10,
    headingHeight = 40,
    headingMargin = 40,
    bracketSpacing = 80,
    disableAnimations = false,
    isSingleElimination = false,
}) => {
    // Helper to get raw ID (remove 'db-', 'wb-', 'lb-' prefixes if present)
    const getRawId = (id: string) => id.replace(/^(db-|wb-|lb-|source-)/, '');

    // Calculate positions using the robust slot-based algorithm
    const { matchPositions, totalWidth, totalHeight, winnersBottomY } = useMemo(() => {
        const map = new Map<string, { x: number; y: number }>();
        if (matches.length === 0) return { matchPositions: {}, totalWidth: 0, totalHeight: 0, winnersBottomY: 0 };

        // 1. Group by Round and Bracket Side
        const rounds: Record<string, Record<number, any[]>> = {
            winners: {},
            losers: {},
            final: {}
        };

        matches.forEach(m => {
            const side = m.bracketSide || 'winners';
            if (!rounds[side][m.round]) rounds[side][m.round] = [];
            rounds[side][m.round].push(m);
        });

        // Sort matches in each round by matchNumber
        Object.keys(rounds).forEach(side => {
            Object.keys(rounds[side]).forEach(r => {
                rounds[side][Number(r)].sort((a, b) => a.matchNumber - b.matchNumber);
            });
        });

        // 2. Calculate Positions for Winners Bracket (Slot-Based)
        const wRounds = Object.keys(rounds.winners).map(Number).sort((a, b) => a - b);
        const matchSlots = new Map<string, number>();

        wRounds.forEach((round, rIdx) => {
            const roundMatches = rounds.winners[round];
            roundMatches.forEach((m, idx) => {
                const id = String(m.id);
                const rawId = getRawId(id);
                // Formula for perfect binary tree symmetry:
                // slot = idx * 2^r + (2^r - 1) / 2
                const power = Math.pow(2, rIdx);
                const slot = idx * power + (power - 1) / 2;

                matchSlots.set(id, slot);
                matchSlots.set(rawId, slot);

                const x = leftPadding + (rIdx * (cardWidth + roundGap));
                const y = headingHeight + headingMargin + (slot * (cardHeight + matchGap));
                map.set(id, { x, y });
                map.set(rawId, { x, y });
            });
        });

        // 3. Process Losers Bracket
        const maxWinnersY = Math.max(...Array.from(map.values()).map(p => p.y + cardHeight), 0);
        const losersHeadingY = maxWinnersY + bracketSpacing;
        const losersStartY = losersHeadingY + headingHeight + headingMargin;

        const lRounds = Object.keys(rounds.losers).map(Number).sort((a, b) => a - b);

        lRounds.forEach((round, rIdx) => {
            rounds.losers[round].forEach((m, idx) => {
                const id = String(m.id);
                const rawId = getRawId(id);
                const x = leftPadding + (rIdx * (cardWidth + roundGap));
                const y = losersStartY + (idx * (cardHeight + matchGap));
                map.set(id, { x, y });
                map.set(rawId, { x, y });
            });
        });

        // 4. Finals
        const finalX = leftPadding + (wRounds.length * (cardWidth + roundGap));
        const lastWinnerMatch = rounds.winners[wRounds[wRounds.length - 1]]?.[0];
        let finalY = 100;
        if (lastWinnerMatch) {
            const p = map.get(String(lastWinnerMatch.id));
            if (p) finalY = p.y;
        }

        const fRounds = Object.keys(rounds.final).map(Number).sort((a, b) => a - b);
        fRounds.forEach((r, rIdx) => {
            rounds.final[r].forEach((m, i) => {
                const id = String(m.id);
                const rawId = getRawId(id);
                // Use rIdx for X positioning to separate rounds (e.g. GF vs Reset)
                const x = finalX + (rIdx * (cardWidth + roundGap)) + (i * (cardWidth + 50));
                map.set(id, { x, y: finalY });
                map.set(rawId, { x, y: finalY });
            });
        });

        // Calculate total dimensions
        let maxX = 0, maxY = 0;
        map.forEach(pos => {
            maxX = Math.max(maxX, pos.x + cardWidth);
            maxY = Math.max(maxY, pos.y + cardHeight);
        });

        return {
            matchPositions: Object.fromEntries(map),
            totalWidth: maxX + 100,
            totalHeight: maxY + 100,
            winnersBottomY: maxWinnersY
        };
    }, [matches, cardWidth, cardHeight, roundGap, matchGap, leftPadding, headingHeight, headingMargin, bracketSpacing]);

    // Calculate X offset for filtering
    const filterXOffset = useMemo(() => {
        if (activeFilter.type === 'all') return 0;

        // Find the minimum X of visible matches
        let minX = Infinity;
        matches.forEach(m => {
            if (activeFilter.type === 'winners' && m.bracketSide === 'winners' && m.round === activeFilter.round) {
                const pos = matchPositions[m.id];
                if (pos && pos.x < minX) minX = pos.x;
            }
            if (activeFilter.type === 'losers' && m.bracketSide === 'losers' && m.round === activeFilter.round) {
                const pos = matchPositions[m.id];
                if (pos && pos.x < minX) minX = pos.x;
            }
            if (activeFilter.type === 'final' && m.bracketSide === 'final') {
                const pos = matchPositions[m.id];
                if (pos && pos.x < minX) minX = pos.x;
            }
        });

        return minX === Infinity ? 0 : minX - leftPadding;
    }, [activeFilter, matches, matchPositions, leftPadding]);

    // Calculate Y offset for filtering (specifically for Losers Bracket)
    const filterYOffset = useMemo(() => {
        if (activeFilter.type !== 'losers') return 0;

        let minY = Infinity;
        matches.forEach(m => {
            if (m.bracketSide === 'losers' && m.round === activeFilter.round) {
                const pos = matchPositions[m.id];
                if (pos && pos.y < minY) minY = pos.y;
            }
        });

        // We want the matches to start at roughly y=50 (below the heading)
        return minY === Infinity ? 0 : minY - 50;
    }, [activeFilter, matches, matchPositions]);

    // When filtering to a specific round, compute stacked list positions
    const filteredListPositions = useMemo(() => {
        if (activeFilter.type === 'all') return null;

        const visibleMatches = matches.filter(m => {
            if (activeFilter.type === 'winners') return m.bracketSide === 'winners' && m.round === activeFilter.round;
            if (activeFilter.type === 'losers') return m.bracketSide === 'losers' && m.round === activeFilter.round;
            if (activeFilter.type === 'final') return m.bracketSide === 'final';
            return false;
        });

        // Sort by match_number for consistent ordering
        visibleMatches.sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0));

        const listGap = 8;
        const startY = 50; // below heading
        const positions: Record<string, { x: number; y: number }> = {};
        visibleMatches.forEach((m, i) => {
            positions[m.id] = { x: leftPadding, y: startY + i * (cardHeight + listGap) };
        });

        const listHeight = visibleMatches.length > 0
            ? startY + visibleMatches.length * (cardHeight + listGap) + 50
            : totalHeight;

        return { positions, height: listHeight };
    }, [activeFilter, matches, leftPadding, cardHeight, totalHeight]);

    const isMatchVisible = (match: BracketMatch) => {
        if (customFilterPredicate) return customFilterPredicate(match);
        if (activeFilter.type === 'all') return true;
        if (activeFilter.type === 'winners') return match.bracketSide === 'winners' && match.round === activeFilter.round;
        if (activeFilter.type === 'losers') return match.bracketSide === 'losers' && match.round === activeFilter.round;
        if (activeFilter.type === 'final') return match.bracketSide === 'final';
        return false;
    };

    return (
        <div
            className="relative"
            style={{ width: totalWidth, height: filteredListPositions ? filteredListPositions.height : totalHeight, minWidth: '100%' }}
        >
            {/* Connector Lines (SVG) — only in full bracket view */}
            {activeFilter.type === 'all' && (
                <svg
                    className="absolute top-0 left-0 pointer-events-none overflow-visible"
                    style={{ width: totalWidth, height: totalHeight }}
                >
                    {matches.map(match => {
                        if (!match.nextMatchId) return null;
                        const sourcePos = matchPositions[match.id] || matchPositions[getRawId(String(match.id))];
                        const targetPos = matchPositions[match.nextMatchId] || matchPositions[getRawId(match.nextMatchId)];
                        if (!sourcePos || !targetPos) return null;

                        const startX = sourcePos.x + cardWidth;
                        const startY = sourcePos.y + cardHeight / 2;
                        const endX = targetPos.x;
                        const endY = targetPos.y + cardHeight / 2;
                        const midX = startX + (endX - startX) / 2;

                        return (
                            <path
                                key={`edge-w-${match.id}`}
                                d={`M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`}
                                fill="none"
                                stroke="#475569"
                                strokeWidth="2"
                                className="opacity-50"
                            />
                        );
                    })}
                </svg>
            )}
            {/* Winners Bracket Heading */}
            {(activeFilter.type === 'all' || activeFilter.type === 'winners') &&
                matches.some(m => m.bracketSide === 'winners') &&
                !isSingleElimination && (
                    <div style={{ position: 'absolute', left: leftPadding, top: 0, width: 350, zIndex: 100 }}>
                        <h3 className="text-xl font-semibold tracking-tight text-white flex items-center gap-3">
                            <div className="p-1.5 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                                <span className="text-yellow-500">🏆</span>
                            </div>
                            Winners Bracket
                        </h3>
                    </div>
                )}

            {/* Losers Bracket Heading */}
            {(activeFilter.type === 'all' || activeFilter.type === 'losers') && matches.some(m => m.bracketSide === 'losers') && (
                <div style={{
                    position: 'absolute',
                    left: leftPadding,
                    top: activeFilter.type === 'losers' ? 0 : (winnersBottomY + bracketSpacing),
                    width: 350,
                    zIndex: 100
                }}>
                    <h3 className="text-xl font-semibold tracking-tight text-white flex items-center gap-3">
                        <div className="p-1.5 rounded-md bg-red-500/10 border border-red-500/20">
                            <span className="text-red-500">⚔️</span>
                        </div>
                        Losers Bracket
                    </h3>
                </div>
            )}

            {/* Match Cards */}
            <AnimatePresence mode='popLayout'>
                {matches.map(match => {
                    if (!match) return null;
                    if (!isMatchVisible(match)) return null;

                    const pos = filteredListPositions
                        ? filteredListPositions.positions[match.id]
                        : matchPositions[match.id];
                    if (!pos) return null;
                    const left = filteredListPositions ? pos.x : pos.x - filterXOffset;
                    const top = filteredListPositions ? pos.y : pos.y - filterYOffset;
                    return (
                        <motion.div
                            key={match.id}
                            initial={disableAnimations ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={disableAnimations ? undefined : { opacity: 0, scale: 0.9 }}
                            transition={disableAnimations ? { duration: 0 } : { duration: 0.2 }}
                            style={{ position: 'absolute', left, top }}
                        >
                            <ReadOnlyMatchCard
                                match={match}
                                x={0} // Position handled by motion.div
                                y={0}
                                onClick={() => onMatchClick?.(match)}
                                hasAutomatedResults={hasResultsMap[getRawId(String(match.id))]?.length > 0}
                                hasProofs={hasProofsMap[getRawId(String(match.id))]?.length > 0}
                            />
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};
