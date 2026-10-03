import { forwardRef } from 'react';
import type { ValorantAgent } from '@/hooks/useValorantCatalog';
import type { SharePlayer, ShareTeam } from '@/services/matchStats/shareCardModel';
import { Caption, Crest, Cue, Wordmark } from './shareCardParts';
import { BODY, DISPLAY, MUTED, PLAYER_CARD_SIZE, ROSE, rgba, STAGE, teamAccent } from './shareCardTheme';

type Props = {
    player: SharePlayer;
    team: ShareTeam;
    opponent: ShareTeam;
    isMvp: boolean;
    agent?: ValorantAgent;
    mapName: string;
    mapSplash: string | null;
    /** #rrggbb; falls back to a stable colour from the team name. */
    color?: string | null;
};

const NOTCH = 24;

function Stat({ label, value, color, hero = false }: { label: string; value: string | number | null; color: string; hero?: boolean }) {
    return (
        <div
            style={{
                position: 'relative', padding: hero ? '26px 30px 28px' : '22px 26px 24px', gridColumn: hero ? 'span 2' : undefined,
                background: hero ? `linear-gradient(135deg, ${rgba(color, 0.32)}, rgba(17,17,20,0.92) 70%)` : 'rgba(17,17,20,0.88)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
        >
            {hero ? <div style={{ position: 'absolute', left: 0, top: 0, width: 72, height: 3, background: color }} /> : null}
            <Caption size={13} color={MUTED} spacing="0.24em">{label}</Caption>
            <div style={{ ...DISPLAY, marginTop: 12, fontWeight: 800, fontSize: hero ? 78 : 56, fontVariantNumeric: 'tabular-nums' }}>{value ?? '–'}</div>
        </div>
    );
}

/** 4:5 player card: the agent lit in the team colour, the result, and the numbers. */
export const PlayerShareCard = forwardRef<HTMLDivElement, Props>(({ player, team, opponent, isMvp, agent, mapName, mapSplash, color }, ref) => {
    const accent = teamAccent(team.name, color);
    return (
        <div ref={ref} style={{ ...BODY, position: 'relative', overflow: 'hidden', background: STAGE, color: '#FAFAFA', ...PLAYER_CARD_SIZE }}>
            {mapSplash ? <img src={mapSplash} crossOrigin="anonymous" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.34 }} /> : null}
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 60% 50% at 72% 40%, ${rgba(accent, 0.5)}, transparent 70%)` }} />
            {agent?.fullPortrait ? (
                <img
                    src={agent.fullPortrait}
                    crossOrigin="anonymous"
                    alt=""
                    style={{
                        position: 'absolute', right: -170, top: 70, height: 1000, width: 1000, objectFit: 'cover', objectPosition: 'top center',
                        WebkitMaskImage: 'linear-gradient(180deg, #000 55%, transparent 88%)', maskImage: 'linear-gradient(180deg, #000 55%, transparent 88%)',
                    }}
                />
            ) : null}
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${rgba('#09090b', 0.85)} 0%, rgba(9,9,11,0.25) 55%, rgba(9,9,11,0) 75%), linear-gradient(0deg, ${STAGE} 26%, rgba(9,9,11,0) 56%)` }} />

            <div style={{ position: 'absolute', inset: 0, padding: '64px 64px 52px', display: 'flex', flexDirection: 'column' }}>
                <div
                    style={{
                        alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 18, padding: '14px 30px 14px 14px',
                        clipPath: `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% ${NOTCH}px, 100% 100%, 0 100%)`,
                        background: `linear-gradient(90deg, ${rgba(accent, 0.6)}, ${rgba(accent, 0.12)})`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                    }}
                >
                    <Crest name={team.name} logo={team.logo} size={60} />
                    <div>
                        <Caption size={15} color="#FAFAFA">{team.name}</Caption>
                        <div style={{ marginTop: 6 }}><Caption size={12} color="rgba(250,250,250,0.7)">{mapName} · vs {opponent.name}</Caption></div>
                    </div>
                </div>

                <div style={{ marginTop: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
                        {isMvp ? <Cue width={56} /> : null}
                        <Caption size={15} color={isMvp ? ROSE : accent}>{isMvp ? 'Match MVP' : [agent?.role, 'performance'].filter(Boolean).join(' ')}</Caption>
                    </div>
                    <div style={{ ...DISPLAY, fontWeight: 800, fontSize: player.name.length > 12 ? 96 : 128, maxWidth: 820, overflowWrap: 'anywhere', textShadow: '0 4px 40px rgba(0,0,0,0.6)' }}>{player.name}</div>
                    <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 18 }}>
                        <Caption size={18} color="#D4D4D8" spacing="0.2em">{[agent?.displayName, agent?.role].filter(Boolean).join(' · ') || 'Agent'}</Caption>
                        <span
                            style={{
                                ...DISPLAY, fontWeight: 800, fontSize: 22, padding: '8px 14px', letterSpacing: '0.02em',
                                background: team.won ? '#FAFAFA' : 'rgba(9,9,11,0.6)', color: team.won ? STAGE : '#A1A1AA',
                                boxShadow: team.won ? undefined : 'inset 0 0 0 1px rgba(255,255,255,0.14)',
                            }}
                        >
                            {team.won ? 'WIN' : 'LOSS'} {team.score}–{opponent.score}
                        </span>
                    </div>

                    <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                        <Stat hero color={accent} label="K / D / A" value={`${player.kills} / ${player.deaths} / ${player.assists}`} />
                        <Stat color={accent} label="ACS" value={player.acs} />
                        <Stat color={accent} label="ADR" value={player.adr} />
                        <Stat color={accent} label="HS%" value={player.hsPct === null ? null : `${player.hsPct}%`} />
                        <Stat color={accent} label={player.firstKills === null ? 'K/D' : 'First kills'} value={player.firstKills ?? player.kd.toFixed(1)} />
                    </div>

                    <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Wordmark height={28} />
                        <Caption size={12} color={MUTED}>K/D {player.kd.toFixed(1)} · Riot match record</Caption>
                    </div>
                </div>
            </div>
        </div>
    );
});

PlayerShareCard.displayName = 'PlayerShareCard';
