import { useEffect, useMemo, useState } from 'react';
import { MatchShareCard } from '@/components/share-cards/MatchShareCard';
import { PlayerShareCard } from '@/components/share-cards/PlayerShareCard';
import { MATCH_CARD_SIZE, PLAYER_CARD_SIZE } from '@/components/share-cards/shareCardTheme';
import { useValorantAgents, type ValorantAgent } from '@/hooks/useValorantCatalog';
import { valorantMapSplash } from '@/services/maps/valorantMapAssets';
import { buildShareCardModel, findSharePlayer, type ShareCardModel } from '@/services/matchStats/shareCardModel';
import type { EnrichedRiotMatchData } from '@/types/enrichedRiotMatch';

type Props = {
    match: EnrichedRiotMatchData;
    mode: 'match' | 'player' | 'compare';
    /** Riot side of the team drawn on the left. */
    leftSide: string;
    teamAName: string;
    teamBName: string;
    teamALogo?: string;
    teamBLogo?: string;
    teamAColor?: string | null;
    teamBColor?: string | null;
    mapName: string;
    playerPuuid?: string | null;
    leftPlayerPuuid?: string | null;
    rightPlayerPuuid?: string | null;
};

const EMPTY: Record<string, ValorantAgent> = {};

/** Largest scale that fits a box of this size inside the window. */
function useFitScale(width: number, height: number) {
    const read = () => Math.min(window.innerWidth / width, window.innerHeight / height);
    const [scale, setScale] = useState(read);
    useEffect(() => {
        const onResize = () => setScale(Math.min(window.innerWidth / width, window.innerHeight / height));
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [width, height]);
    return scale;
}

function PlayerCardFor({ model, puuid, agents, splash }: { model: ShareCardModel; puuid: string; agents: Record<string, ValorantAgent>; splash: string | null }) {
    const found = findSharePlayer(model, puuid);
    if (!found) return null;
    const opponent = found.team === model.teams[0] ? model.teams[1] : model.teams[0];
    return (
        <PlayerShareCard player={found.player} team={found.team} opponent={opponent} isMvp={found.isMvp}
            agent={agents[found.player.agentId]} mapName={model.mapName} mapSplash={splash} />
    );
}

/** OBS browser source for the "esportra" theme: the redesigned share cards, scaled to fit. */
export function EsportraOverlay({ match, mode, leftSide, teamAName, teamBName, teamALogo, teamBLogo, teamAColor, teamBColor, mapName, playerPuuid, leftPlayerPuuid, rightPlayerPuuid }: Props) {
    const agents = useValorantAgents().data ?? EMPTY;
    const model = useMemo(
        () => buildShareCardModel(match, { team1Name: teamAName, team2Name: teamBName, team1Logo: teamALogo, team2Logo: teamBLogo, t1Side: leftSide, mapName }),
        [match, teamAName, teamBName, teamALogo, teamBLogo, leftSide, mapName],
    );
    const splash = valorantMapSplash(mapName);
    const size = mode === 'match'
        ? MATCH_CARD_SIZE
        : mode === 'compare' ? { width: PLAYER_CARD_SIZE.width * 2 + 48, height: PLAYER_CARD_SIZE.height } : PLAYER_CARD_SIZE;
    const scale = useFitScale(size.width, size.height);
    const others = model.teams.flatMap((team) => team.players).map((p) => p.puuid);
    const first = playerPuuid || model.mvpPuuid || others[0] || '';
    const left = leftPlayerPuuid || model.mvpPuuid || others[0] || '';
    const right = rightPlayerPuuid || others.find((id) => id !== left) || '';

    return (
        <main className="grid h-dvh w-dvw place-items-center overflow-hidden bg-transparent">
            <div style={{ width: size.width * scale, height: size.height * scale }}>
                <div style={{ ...size, transform: `scale(${scale})`, transformOrigin: 'top left', display: 'flex', gap: 48 }}>
                    {mode === 'match' ? <MatchShareCard model={model} agents={agents} mapSplash={splash} teamColors={[teamAColor, teamBColor]} /> : null}
                    {mode === 'player' ? <PlayerCardFor model={model} puuid={first} agents={agents} splash={splash} /> : null}
                    {mode === 'compare' ? (
                        <>
                            <PlayerCardFor model={model} puuid={left} agents={agents} splash={splash} />
                            <PlayerCardFor model={model} puuid={right} agents={agents} splash={splash} />
                        </>
                    ) : null}
                </div>
            </div>
        </main>
    );
}
