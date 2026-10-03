import type { CSSProperties } from 'react';
import type { ValorantAgent } from '@/hooks/useValorantCatalog';
import type { SharePlayer } from '@/services/matchStats/shareCardModel';
import { Caption } from '../shareCardParts';
import { DISPLAY, MUTED, ROSE, rgba } from '../shareCardTheme';

type Side = { player: SharePlayer; agent?: ValorantAgent; color: string; isMatchMvp: boolean };

const HEIGHT = 330;

/** Portrait of a team's MVP, lit from behind in the team colour and faded into the boards. */
function Portrait({ side, align }: { side: Side; align: 'left' | 'right' }) {
    const box: CSSProperties = { position: 'absolute', bottom: -86, height: HEIGHT + 190, width: 420, [align]: 300 };
    return (
        <div style={box}>
            <div style={{ position: 'absolute', inset: '10% 0 0', background: `radial-gradient(closest-side, ${rgba(side.color, 0.55)}, ${rgba(side.color, 0)} 100%)` }} />
            {side.agent?.fullPortrait ? (
                <img
                    src={side.agent.fullPortrait}
                    crossOrigin="anonymous"
                    alt=""
                    style={{
                        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center',
                        transform: align === 'right' ? 'scaleX(-1)' : undefined,
                        WebkitMaskImage: 'linear-gradient(180deg, #000 62%, transparent 96%)',
                        maskImage: 'linear-gradient(180deg, #000 62%, transparent 96%)',
                    }}
                />
            ) : null}
        </div>
    );
}

function Nameplate({ side, align }: { side: Side; align: 'left' | 'right' }) {
    const { player, agent, isMatchMvp } = side;
    return (
        <div style={{ position: 'absolute', top: 62, [align]: 0, width: 380, textAlign: align, textShadow: '0 2px 24px rgba(0,0,0,0.65)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: align === 'left' ? 'flex-start' : 'flex-end' }}>
                {isMatchMvp ? <div style={{ width: 36, height: 4, background: ROSE }} /> : null}
                <Caption size={15} color={isMatchMvp ? ROSE : side.color} spacing="0.32em">{isMatchMvp ? 'Match MVP' : 'Team MVP'}</Caption>
            </div>
            <div style={{ ...DISPLAY, marginTop: 16, fontWeight: 800, fontSize: player.name.length > 10 ? 58 : 76, color: '#FAFAFA', overflowWrap: 'anywhere' }}>{player.name}</div>
            <div style={{ marginTop: 14 }}>
                <Caption size={15} color="#D4D4D8" spacing="0.24em">{[agent?.displayName, agent?.role].filter(Boolean).join(' · ') || 'Agent'}</Caption>
            </div>
        </div>
    );
}

const STATS: Array<{ label: string; value: (p: SharePlayer) => number | null; show: (p: SharePlayer) => string }> = [
    { label: 'K / D', value: (p) => p.kills - p.deaths, show: (p) => `${p.kills}/${p.deaths}` },
    { label: 'ACS', value: (p) => p.acs, show: (p) => String(p.acs) },
    { label: 'ADR', value: (p) => p.adr, show: (p) => (p.adr === null ? '–' : String(p.adr)) },
    { label: 'HS%', value: (p) => p.hsPct, show: (p) => (p.hsPct === null ? '–' : `${p.hsPct}%`) },
    { label: 'FK', value: (p) => p.firstKills, show: (p) => (p.firstKills === null ? '–' : String(p.firstKills)) },
];

/** Head to head: the better number of each pair is white, the other grey. */
function Versus({ left, right }: { left: SharePlayer; right: SharePlayer }) {
    return (
        <div style={{ position: 'absolute', left: '50%', top: 16, width: 340, marginLeft: -170, display: 'grid', gap: 4 }}>
            {STATS.map((stat) => {
                const l = stat.value(left) ?? -Infinity;
                const r = stat.value(right) ?? -Infinity;
                const tone = (mine: number, theirs: number) => (mine >= theirs ? '#FAFAFA' : '#71717A');
                return (
                    <div key={stat.label} style={{ display: 'grid', gridTemplateColumns: '1fr 84px 1fr', alignItems: 'center', height: 56, background: 'linear-gradient(90deg, rgba(9,9,11,0), rgba(9,9,11,0.72) 30%, rgba(9,9,11,0.72) 70%, rgba(9,9,11,0))' }}>
                        <span style={{ ...DISPLAY, fontWeight: 800, fontSize: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: tone(l, r) }}>{stat.show(left)}</span>
                        <Caption size={12} color={MUTED} spacing="0.2em" style={{ textAlign: 'center' }}>{stat.label}</Caption>
                        <span style={{ ...DISPLAY, fontWeight: 800, fontSize: 40, fontVariantNumeric: 'tabular-nums', color: tone(r, l) }}>{stat.show(right)}</span>
                    </div>
                );
            })}
        </div>
    );
}

/** The two team MVPs face each other across their head-to-head numbers. */
export function MatchCardDuel({ left, right }: { left: Side; right: Side }) {
    return (
        <div style={{ position: 'relative', height: HEIGHT }}>
            <Portrait side={left} align="left" />
            <Portrait side={right} align="right" />
            <Nameplate side={left} align="left" />
            <Nameplate side={right} align="right" />
            <Versus left={left.player} right={right.player} />
        </div>
    );
}
