import { forwardRef } from 'react';
import type { ValorantAgent } from '@/hooks/useValorantCatalog';
import type { ShareCardModel, SharePlayer, ShareTeam } from '@/services/matchStats/shareCardModel';
import { Backdrop, Caption, Crest, Cue, Wordmark } from './shareCardParts';
import { BODY, DISPLAY, HAIR, MATCH_CARD_SIZE, MUTED, PANEL, STAGE } from './shareCardTheme';

type Props = {
    model: ShareCardModel;
    agents: Record<string, ValorantAgent>;
    mapSplash: string | null;
    /** e.g. "Upper bracket · Round 2 · Map 1" */
    caption?: string;
};

const COLUMNS = '64px minmax(0,1fr) 150px 92px 92px 92px';

function PlayerRow({ player, agent, isMvp, dim }: { player: SharePlayer; agent?: ValorantAgent; isMvp: boolean; dim: boolean }) {
    const stat = (value: string | number | null) => (
        <span style={{ ...DISPLAY, fontWeight: 800, fontSize: 30, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: dim ? '#A1A1AA' : '#FAFAFA' }}>
            {value ?? '–'}
        </span>
    );
    return (
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: COLUMNS, alignItems: 'center', gap: 20, height: 84, padding: '0 28px', background: PANEL }}>
            {isMvp ? <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: '#FAFAFA' }} /> : null}
            <div style={{ width: 56, height: 56, background: '#18181B', overflow: 'hidden' }}>
                {agent?.displayIcon ? <img src={agent.displayIcon} crossOrigin="anonymous" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
            </div>
            <div style={{ minWidth: 0 }}>
                <div style={{ ...BODY, fontSize: 26, fontWeight: 700, color: dim ? '#D4D4D8' : '#FAFAFA', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {player.name}
                    {player.tag ? <span style={{ fontWeight: 500, color: MUTED }}> #{player.tag}</span> : null}
                </div>
                <div style={{ marginTop: 4, display: 'flex', gap: 12 }}>
                    <Caption size={12} color={MUTED} spacing="0.2em">{agent?.displayName ?? 'Agent'}</Caption>
                    {isMvp ? <Caption size={12} color="#FAFAFA" spacing="0.2em">MVP</Caption> : null}
                </div>
            </div>
            {stat(`${player.kills}/${player.deaths}/${player.assists}`)}
            {stat(player.acs)}
            {stat(player.adr)}
            {stat(player.hsPct === null ? null : `${player.hsPct}%`)}
        </div>
    );
}

function TeamBoard({ team, agents, mvpPuuid }: { team: ShareTeam; agents: Record<string, ValorantAgent>; mvpPuuid: string | null }) {
    return (
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: COLUMNS, gap: 20, padding: '0 28px 14px', alignItems: 'end' }}>
                <span />
                <Caption size={13} color={team.won ? '#FAFAFA' : MUTED} style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.won ? `${team.name} · Win` : team.name}</Caption>
                {['K / D / A', 'ACS', 'ADR', 'HS%'].map((label) => (
                    <Caption key={label} size={12} color={MUTED} spacing="0.2em" style={{ textAlign: 'right' }}>{label}</Caption>
                ))}
            </div>
            <div style={{ display: 'grid', gap: 1, background: HAIR, boxShadow: `0 0 0 1px ${HAIR}` }}>
                {team.players.map((player) => (
                    <PlayerRow key={player.puuid} player={player} agent={agents[player.agentId]} isMvp={player.puuid === mvpPuuid} dim={!team.won} />
                ))}
            </div>
        </div>
    );
}

function Side({ team, align }: { team: ShareTeam; align: 'left' | 'right' }) {
    return (
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 32, flexDirection: align === 'left' ? 'row' : 'row-reverse' }}>
            <Crest name={team.name} logo={team.logo} size={120} dim={!team.won} />
            <div
                style={{
                    ...DISPLAY, minWidth: 0, fontWeight: 800, fontSize: team.name.length > 14 ? 48 : 64, lineHeight: 1.05,
                    color: team.won ? '#FAFAFA' : MUTED, textAlign: align, overflowWrap: 'anywhere',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}
            >
                {team.name}
            </div>
        </div>
    );
}

/** 16:9 full-time card for one map: versus lockup, the score, and both scoreboards. */
export const MatchShareCard = forwardRef<HTMLDivElement, Props>(({ model, agents, mapSplash, caption }, ref) => {
    const [team1, team2] = model.teams;
    const score = (team: ShareTeam) => (
        <span style={{ ...DISPLAY, fontWeight: 800, fontSize: 168, fontVariantNumeric: 'tabular-nums', color: team.won ? '#FAFAFA' : '#52525B' }}>{team.score}</span>
    );

    return (
        <div ref={ref} style={{ ...BODY, position: 'relative', overflow: 'hidden', background: STAGE, color: '#FAFAFA', ...MATCH_CARD_SIZE }}>
            <Backdrop src={mapSplash} opacity={0.3} fade={`linear-gradient(180deg, rgba(9,9,11,0.55) 0%, ${STAGE} 52%)`} />
            <div style={{ position: 'absolute', inset: 0, padding: '72px 96px 64px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <Caption size={16}>Full time · {model.mapName}{caption ? ` · ${caption}` : ''}</Caption>
                        <Cue style={{ marginTop: 22 }} />
                    </div>
                    <Caption size={14} color={MUTED}>{model.roundCount} rounds</Caption>
                </div>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 48 }}>
                    <Side team={team1} align="left" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                        {score(team1)}
                        <span style={{ ...DISPLAY, fontSize: 80, color: '#3F3F46' }}>–</span>
                        {score(team2)}
                    </div>
                    <Side team={team2} align="right" />
                </div>

                <div style={{ display: 'flex', gap: 40 }}>
                    <TeamBoard team={team1} agents={agents} mvpPuuid={model.mvpPuuid} />
                    <TeamBoard team={team2} agents={agents} mvpPuuid={model.mvpPuuid} />
                </div>

                <div style={{ marginTop: 36, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Wordmark />
                    <Caption size={13} color={MUTED}>Stats from the Riot match record</Caption>
                </div>
            </div>
        </div>
    );
});

MatchShareCard.displayName = 'MatchShareCard';
