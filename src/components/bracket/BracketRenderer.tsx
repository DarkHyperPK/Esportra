import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReadOnlyMatchCard } from './ReadOnlyMatchCard';
import { BracketMatch } from '@/types/bracketTypes';
import type { BracketEdge } from '@/types/bracket-graph';

interface BracketRendererProps {
    matches: BracketMatch[];
    activeFilter: { type: string; round?: number };
    customFilterPredicate?: (match: BracketMatch) => boolean;
    onMatchClick?: (match: BracketMatch) => void;
    hasResultsMap?: Record<string, any[]>;
    hasProofsMap?: Record<string, string[]>;
    edges?: BracketEdge[];
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
    edges = [],
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

    // Build classic bracket connector paths grouped by target match
    const connectorPaths = useMemo(() => {
        const paths: { d: string; type: 'winner' | 'loser' }[] = [];
        const midH = cardHeight / 2;

        // Key insight: group sources by BOTH target AND source column (X position).
        // This prevents cross-bracket grouping (e.g. WB Final + LB Final → Grand Final
        // should NOT share a vertical bar since they are in completely different Y areas).
        // groupKey = `${targetId}::${roundedSourceX}`
        const connections = new Map<string, { targetId: string; sourceIds: string[] }>();

        const addConnection = (sourceId: string, targetId: string) => {
            const srcPos = matchPositions[sourceId];
            const tgtPos = matchPositions[targetId];
            if (!srcPos || !tgtPos) return;
            // Round X to nearest pixel to avoid float grouping mismatches
            const srcX = Math.round(srcPos.x);
            const key = `${targetId}::${srcX}`;
            if (!connections.has(key)) connections.set(key, { targetId, sourceIds: [] });
            connections.get(key)!.sourceIds.push(sourceId);
        };

        let hasMatchLevelEdges = false;
        matches.forEach(m => {
            if (m.nextMatchId) {
                addConnection(String(m.id), m.nextMatchId);
                hasMatchLevelEdges = true;
            }
        });

        // Fallback: use graph edges (winner-type only) when matches don't carry nextMatchId
        if (!hasMatchLevelEdges && edges.length > 0) {
            edges.forEach(e => {
                if (e.type !== 'winner') return; // only draw winner advancement lines
                const srcId = `db-${e.source_match_id}`;
                const tgtId = `db-${e.target_match_id}`;
                addConnection(srcId, tgtId);
            });
        }

        connections.forEach(({ targetId, sourceIds }) => {
            const targetPos = matchPositions[targetId];
            if (!targetPos || sourceIds.length === 0) return;

            const rightEdge = matchPositions[sourceIds[0]].x + cardWidth;
            const midX = rightEdge + (targetPos.x - rightEdge) / 2;
            const ys = sourceIds
                .map(id => matchPositions[id].y + midH)
                .sort((a, b) => a - b);

            if (sourceIds.length >= 2) {
                // Classic bracket: stubs → vertical bar → horizontal to target
                const topY = ys[0];
                const botY = ys[ys.length - 1];

                sourceIds.forEach(id => {
                    const srcY = matchPositions[id].y + midH;
                    paths.push({ d: `M ${rightEdge} ${srcY} H ${midX}`, type: 'winner' });
                });

                paths.push({ d: `M ${midX} ${topY} V ${botY}`, type: 'winner' });

                const midY = (topY + botY) / 2;
                paths.push({ d: `M ${midX} ${midY} H ${targetPos.x}`, type: 'winner' });
            } else {
                // Single source: horizontal stub → optional vertical jog → horizontal to target
                const srcY = ys[0];
                const tgtY = targetPos.y + midH;
                if (Math.abs(srcY - tgtY) < 1) {
                    // Same row — straight horizontal
                    paths.push({ d: `M ${rightEdge} ${srcY} H ${targetPos.x}`, type: 'winner' });
                } else {
                    // Different row — elbow connector
                    paths.push({ d: `M ${rightEdge} ${srcY} H ${midX} V ${tgtY} H ${targetPos.x}`, type: 'winner' });
                }
            }
        });

        return paths;
    }, [matches, matchPositions, cardWidth, cardHeight, edges]);

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
            style={{ width: totalWidth, height: totalHeight, minWidth: '100%' }}
        >
            {/* Connector Lines - Only show when viewing all matches */}
            {activeFilter.type === 'all' && connectorPaths.length > 0 && (
                <svg
                    className="absolute inset-0 pointer-events-none"
                    style={{ width: totalWidth, height: totalHeight }}
                >
                    {connectorPaths.map((seg, i) => (
                        <path
                            key={i}
                            d={seg.d}
                            fill="none"
                            stroke={seg.type === 'loser' ? '#ef4444' : '#475569'}
                            strokeWidth={1.5}
                            strokeDasharray={seg.type === 'loser' ? '4 3' : undefined}
                            className="opacity-40"
                        />
                    ))}
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

                    const pos = matchPositions[match.id];
                    if (!pos) return null;
                    return (
                        <motion.div
                            key={match.id}
                            initial={disableAnimations ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={disableAnimations ? undefined : { opacity: 0, scale: 0.9 }}
                            transition={disableAnimations ? { duration: 0 } : { duration: 0.2 }}
                            style={{ position: 'absolute', left: pos.x - filterXOffset, top: pos.y - filterYOffset }}
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
