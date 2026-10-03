import { forwardRef } from 'react';
import type { ValorantAgent } from '@/hooks/useValorantCatalog';
import type { SharePlayer, ShareTeam } from '@/services/matchStats/shareCardModel';
import { Backdrop, Caption, Crest, Cue, Wordmark } from './shareCardParts';
import { BODY, DISPLAY, HAIR, MUTED, PANEL, PLAYER_CARD_SIZE, ROSE, STAGE } from './shareCardTheme';


type Props = {
    player: SharePlayer;
    team: ShareTeam;
    opponent: ShareTeam;
    isMvp: boolean;
    agent?: ValorantAgent;
    mapName: string;
    mapSplash: string | null;
};

function Stat({ label, value, hero = false }: { label: string; value: string | number | null; hero?: boolean }) {
    return (
        <div style={{ padding: '26px 30px', background: PANEL, gridColumn: hero ? 'span 2' : undefined }}>
            <Caption size={13} color={MUTED} spacing="0.24em">{label}</Caption>
            <div style={{ ...DISPLAY, marginTop: 12, fontWeight: 800, fontSize: hero ? 76 : 60, fontVariantNumeric: 'tabular-nums' }}>{value ?? '–'}</div>
        </div>
    );
}

/** 4:5 player card: who, how they played, and the result, over their agent. */
export const PlayerShareCard = forwardRef<HTMLDivElement, Props>(({ player, team, opponent, isMvp, agent, mapName, mapSplash }, ref) => (
    <div ref={ref} style={{ ...BODY, position: 'relative', overflow: 'hidden', background: STAGE, color: '#FAFAFA', ...PLAYER_CARD_SIZE }}>
        <Backdrop src={mapSplash} opacity={0.22} fade={`linear-gradient(180deg, rgba(9,9,11,0.4) 0%, ${STAGE} 62%)`} />
        {agent?.fullPortrait ? (
            <img
                src={agent.fullPortrait}
                crossOrigin="anonymous"
                alt=""
                style={{ position: 'absolute', right: -260, top: 40, height: 1060, width: 'auto', objectFit: 'contain', opacity: 0.92 }}
            />
        ) : null}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${STAGE} 18%, rgba(9,9,11,0.55) 55%, rgba(9,9,11,0) 80%), linear-gradient(0deg, ${STAGE} 30%, rgba(9,9,11,0) 58%)` }} />

        <div style={{ position: 'absolute', inset: 0, padding: '72px 72px 60px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <Crest name={team.name} logo={team.logo} size={64} />
                <div>
                    <Caption size={15} color="#FAFAFA">{team.name}</Caption>
                    <div style={{ marginTop: 6 }}><Caption size={13} color={MUTED}>{mapName} · vs {opponent.name}</Caption></div>
                </div>
            </div>

            <div style={{ marginTop: 'auto' }}>
                {isMvp ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 26 }}>
                        <Cue width={56} />
                        <Caption size={15} color={ROSE}>Match MVP</Caption>
                    </div>
                ) : null}
                <div style={{ ...DISPLAY, fontWeight: 800, fontSize: player.name.length > 12 ? 96 : 124, maxWidth: 820, overflowWrap: 'anywhere' }}>{player.name}</div>
                <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 18 }}>
                    {player.tag ? <Caption size={18} color={MUTED} spacing="0.16em">#{player.tag}</Caption> : null}
                    <Caption size={18} color="#D4D4D8" spacing="0.2em">{agent?.displayName ?? 'Agent'}</Caption>
                    <span
                        style={{
                            ...DISPLAY, fontWeight: 800, fontSize: 22, padding: '8px 14px', letterSpacing: '0.02em',
                            background: team.won ? '#FAFAFA' : 'transparent', color: team.won ? STAGE : '#A1A1AA',
                            boxShadow: team.won ? undefined : `inset 0 0 0 1px ${HAIR}`,
                        }}
                    >
                        {team.won ? 'WIN' : 'LOSS'} {team.score}–{opponent.score}
                    </span>
                </div>

                <div style={{ marginTop: 44, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: HAIR, boxShadow: `0 0 0 1px ${HAIR}` }}>
                    <Stat hero label="K / D / A" value={`${player.kills} / ${player.deaths} / ${player.assists}`} />
                    <Stat label="ACS" value={player.acs} />
                    <Stat label="ADR" value={player.adr} />
                    <Stat label="K/D" value={player.kd.toFixed(1)} />
                    <Stat label={player.firstKills === null ? 'HS%' : 'First kills'} value={player.firstKills === null ? (player.hsPct === null ? null : `${player.hsPct}%`) : player.firstKills} />
                </div>

                <div style={{ marginTop: 36, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Wordmark height={30} />
                    <Caption size={12} color={MUTED}>{player.hsPct !== null && player.firstKills !== null ? `HS ${player.hsPct}% · ` : ''}Riot match record</Caption>
                </div>
            </div>
        </div>
    </div>
));

PlayerShareCard.displayName = 'PlayerShareCard';
