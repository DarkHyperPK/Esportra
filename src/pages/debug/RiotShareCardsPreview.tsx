import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShareCardsPanel } from '@/components/share-cards/ShareCardsPanel';
import { MatchShareCard } from '@/components/share-cards/MatchShareCard';
import { PlayerShareCard } from '@/components/share-cards/PlayerShareCard';
import { MATCH_CARD_SIZE, PLAYER_CARD_SIZE } from '@/components/share-cards/shareCardTheme';
import { useEnrichedRiotMatch } from '@/hooks/useRiotGameDetails';
import { useValorantAgents, useValorantMaps, type ValorantAgent } from '@/hooks/useValorantCatalog';
import { valorantMapSplash } from '@/services/maps/valorantMapAssets';
import { buildShareCardModel, findSharePlayer } from '@/services/matchStats/shareCardModel';
import { SAMPLE_SHARE_MATCH } from './shareCardSample';

const EMPTY: Record<string, ValorantAgent> = {};

/**
 * Debug preview for the match-room share cards.
 *   /debug/riot/share-cards?sample=1                         sample match
 *   /debug/riot/share-cards?matchId=…&region=ap&teamA=…      a real Riot match
 *   …&raw=match | raw=player&playerPuuid=…                  one card alone at native size
 */
const RiotShareCardsPreview = () => {
    const [params] = useSearchParams();
    const matchId = params.get('matchId');
    const useSample = params.get('sample') === '1' || !matchId;
    const { data: fetched, isLoading, isError } = useEnrichedRiotMatch(matchId, params.get('region'), !useSample);
    const enriched = useSample ? SAMPLE_SHARE_MATCH : fetched ?? null;
    const agents = useValorantAgents().data ?? EMPTY;
    const maps = useValorantMaps().data;

    const t1Side = params.get('t1Side') === 'Red' ? 'Red' : 'Blue';
    const mapName = params.get('mapName')
        || maps?.find((entry) => entry.mapUrl === enriched?.matchInfo.mapId)?.displayName
        || 'Ascent';
    const team1Name = params.get('teamA') || 'Night Owls';
    const team2Name = params.get('teamB') || 'Crimson Five';
    const team1Logo = params.get('teamALogo') || undefined;
    const team2Logo = params.get('teamBLogo') || undefined;
    const input = { team1Name, team2Name, team1Logo, team2Logo, t1Side, mapName };
    const model = useMemo(
        () => (enriched ? buildShareCardModel(enriched, { team1Name, team2Name, team1Logo, team2Logo, t1Side, mapName }) : null),
        [enriched, team1Name, team2Name, team1Logo, team2Logo, t1Side, mapName],
    );
    const splash = valorantMapSplash(mapName);
    const raw = params.get('raw');
    const focus = model ? findSharePlayer(model, params.get('playerPuuid') || model.mvpPuuid || '') : null;
    const opponent = focus && model ? (focus.team === model.teams[0] ? model.teams[1] : model.teams[0]) : null;

    if (!useSample && isLoading) return <p className="p-10 font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">Loading Riot match…</p>;
    if (!enriched || !model) {
        return <p className="p-10 text-sm text-zinc-400">{isError ? 'Could not load that Riot match. Check matchId and region.' : 'No match data.'}</p>;
    }

    const playerCard = focus && opponent ? (
        <PlayerShareCard player={focus.player} team={focus.team} opponent={opponent} isMvp={focus.isMvp}
            agent={agents[focus.player.agentId]} mapName={mapName} mapSplash={splash} />
    ) : null;

    if (raw === 'match') return <MatchShareCard model={model} agents={agents} mapSplash={splash} caption={params.get('caption') ?? undefined} />;
    if (raw === 'player') return playerCard;

    return (
        <div className="min-h-screen bg-background px-6 py-10 text-white md:px-10">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Debug · share cards</p>
            <h1 className="mt-2 font-heading text-3xl font-bold">{useSample ? 'Sample match' : `Riot match ${matchId}`}</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                The same panel captains and organizers see in the match room. Add <code className="text-zinc-300">raw=match</code> or <code className="text-zinc-300">raw=player</code> to the URL to see one card alone at full size.
            </p>

            <div className="mt-8 max-w-5xl">
                <ShareCardsPanel enriched={enriched} playerPuuids={enriched.players.map((p) => p.puuid)} {...input} caption={params.get('caption') ?? undefined} />
            </div>

            <h2 className="mt-12 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Match card · 1920×1080 at 50%</h2>
            <div className="mt-3 overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.08)]" style={{ width: MATCH_CARD_SIZE.width / 2, height: MATCH_CARD_SIZE.height / 2 }}>
                <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left' }}>
                    <MatchShareCard model={model} agents={agents} mapSplash={splash} caption={params.get('caption') ?? undefined} />
                </div>
            </div>

            <h2 className="mt-12 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Player card · 1080×1350 at 50%</h2>
            <div className="mt-3 overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.08)]" style={{ width: PLAYER_CARD_SIZE.width / 2, height: PLAYER_CARD_SIZE.height / 2 }}>
                <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left' }}>{playerCard}</div>
            </div>
        </div>
    );
};

export default RiotShareCardsPreview;
