import type { BracketMatch } from '@/types/bracketTypes';
import { rawMatchId, type BracketDims, type BracketLayout } from '@/services/bracket/bracketLayout';

type Route = { played: Set<string>; ahead: Set<string>; alive: boolean };

type Props = {
    matches: BracketMatch[];
    layout: BracketLayout;
    dims: BracketDims;
    teamId: string | null;
    route: Route;
    championIsTeam: boolean;
};

type Edge = { key: string; d: string; tone: 'idle' | 'decided' | 'lit' | 'ahead' };

const STROKE: Record<Edge['tone'], { stroke: string; width: number; dash?: string }> = {
    idle: { stroke: 'rgba(255,255,255,0.10)', width: 1 },
    decided: { stroke: 'rgba(255,255,255,0.28)', width: 1 },
    lit: { stroke: '#f43f5e', width: 2 },
    ahead: { stroke: 'rgba(244,63,94,0.55)', width: 1.5, dash: '4 4' },
};

/** Elbow from the right middle of one card to the left middle of the next, turning just before the target. */
const elbow = (x1: number, y1: number, x2: number, y2: number, gap: number) => {
    if (Math.abs(y1 - y2) < 0.5) return `M ${x1} ${y1} H ${x2}`;
    const midX = Math.max(x1 + 8, x2 - gap / 2);
    return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;
};

/**
 * Lines between rounds: faint while undecided, brighter once the feeding match
 * is played, rose along a found team's route and dashed rose on its road ahead.
 */
export const BracketConnectors = ({ matches, layout, dims, teamId, route, championIsTeam }: Props) => {
    const { cardWidth, cardHeight, roundGap } = dims;
    const byRaw = new Map(matches.map((match) => [rawMatchId(match.id), match]));
    const edges: Edge[] = [];

    matches.forEach((match) => {
        if (!match.nextMatchId) return;
        const target = byRaw.get(rawMatchId(match.nextMatchId));
        const from = layout.positions[match.id];
        const to = target ? layout.positions[target.id] : undefined;
        if (!target || !from || !to) return;
        const onRoute = Boolean(teamId) && route.played.has(match.id) && (route.played.has(target.id) || match.winner?.id === teamId);
        const ahead = Boolean(teamId) && route.ahead.has(target.id) && (route.played.has(match.id) || route.ahead.has(match.id));
        edges.push({
            key: `${match.id}->${target.id}`,
            d: elbow(from.x + cardWidth, from.y + cardHeight / 2, to.x, to.y + cardHeight / 2, roundGap),
            tone: onRoute ? 'lit' : ahead ? 'ahead' : match.status === 'completed' ? 'decided' : 'idle',
        });
    });

    if (layout.champion) {
        const source = layout.positions[layout.champion.sourceId];
        if (source) {
            const roadEnds = Boolean(teamId) && route.alive && (route.ahead.has(layout.champion.sourceId) || route.played.has(layout.champion.sourceId));
            const y = source.y + cardHeight / 2;
            edges.push({
                key: 'champion',
                d: `M ${source.x + cardWidth} ${y} H ${layout.champion.x}`,
                tone: championIsTeam ? 'lit' : roadEnds ? 'ahead' : 'decided',
            });
        }
    }

    const order: Edge['tone'][] = ['idle', 'decided', 'ahead', 'lit'];
    edges.sort((a, b) => order.indexOf(a.tone) - order.indexOf(b.tone));

    return (
        <svg aria-hidden className="pointer-events-none absolute left-0 top-0 overflow-visible" style={{ width: layout.width, height: layout.height }}>
            {edges.map((edge) => (
                <path
                    key={edge.key}
                    d={edge.d}
                    fill="none"
                    stroke={STROKE[edge.tone].stroke}
                    strokeWidth={STROKE[edge.tone].width}
                    strokeDasharray={STROKE[edge.tone].dash}
                    strokeLinejoin="miter"
                    shapeRendering="crispEdges"
                />
            ))}
        </svg>
    );
};

export default BracketConnectors;
