import { forwardRef } from 'react';
import type { ValorantAgent } from '@/hooks/useValorantCatalog';
import type { ShareCardModel } from '@/services/matchStats/shareCardModel';
import { MatchCardBoard } from './match/MatchCardBoard';
import { MatchCardDuel } from './match/MatchCardDuel';
import { MatchCardHeader } from './match/MatchCardHeader';
import { Caption, Wordmark } from './shareCardParts';
import { BODY, MATCH_CARD_SIZE, MUTED, rgba, STAGE, teamAccent } from './shareCardTheme';

type Props = {
    model: ShareCardModel;
    agents: Record<string, ValorantAgent>;
    mapSplash: string | null;
    /** e.g. "Upper bracket · Round 2" */
    caption?: string;
    /** Team colours as #rrggbb; each falls back to a stable colour from the team name. */
    teamColors?: [string | null | undefined, string | null | undefined];
};

/** 16:9 post-match screen: score, the two team MVPs head to head, and both boards. */
export const MatchShareCard = forwardRef<HTMLDivElement, Props>(({ model, agents, mapSplash, caption, teamColors }, ref) => {
    const [a, b] = model.teams;
    const colors: [string, string] = [teamAccent(a.name, teamColors?.[0]), teamAccent(b.name, teamColors?.[1])];
    const side = (index: 0 | 1) => {
        const player = model.teams[index].players[0];
        return { player, agent: agents[player?.agentId ?? ''], color: colors[index], isMatchMvp: player?.puuid === model.mvpPuuid };
    };
    const hasDuel = Boolean(a.players[0] && b.players[0]);

    return (
        <div ref={ref} style={{ ...BODY, position: 'relative', overflow: 'hidden', background: STAGE, color: '#FAFAFA', ...MATCH_CARD_SIZE }}>
            {mapSplash ? (
                <img src={mapSplash} crossOrigin="anonymous" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.42 }} />
            ) : null}
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 42% 60% at 0% 38%, ${rgba(colors[0], 0.42)}, transparent 70%), radial-gradient(ellipse 42% 60% at 100% 38%, ${rgba(colors[1], 0.42)}, transparent 70%)` }} />
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(9,9,11,0.35) 0%, rgba(9,9,11,0.5) 38%, ${rgba('#09090b', 0.92)} 66%, ${STAGE} 100%)` }} />
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 75% 70% at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)' }} />

            <div style={{ position: 'absolute', inset: 0, padding: '58px 72px 36px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', zIndex: 3 }}><MatchCardHeader teams={model.teams} colors={colors} mapName={model.mapName} /></div>
                {hasDuel ? <div style={{ marginTop: 18 }}><MatchCardDuel left={side(0)} right={side(1)} /></div> : <div style={{ flex: 1 }} />}
                <div style={{ position: 'relative', zIndex: 2, marginTop: 14, display: 'flex', gap: 40 }}>
                    <MatchCardBoard team={a} agents={agents} color={colors[0]} align="left" />
                    <MatchCardBoard team={b} agents={agents} color={colors[1]} align="right" />
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Wordmark height={26} />
                    <Caption size={12} color={MUTED}>{[caption, `${model.roundCount} rounds`, 'Riot match record'].filter(Boolean).join(' · ')}</Caption>
                </div>
            </div>
        </div>
    );
});

MatchShareCard.displayName = 'MatchShareCard';
