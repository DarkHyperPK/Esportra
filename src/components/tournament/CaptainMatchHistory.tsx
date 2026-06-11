import React, { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Loader2, Swords } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { BracketMatch } from '@/types/bracketTypes';
import { apiClient } from '@/lib/apiClient';
import { FullScoreboard } from './FullScoreboard';
import { MAP_THEMES, getMapSplash } from './fullScoreboardConstants';
import { VetoHistoryTimeline } from './map-veto/VetoHistoryTimeline';
import { useVetoHistory } from '@/hooks/useVetoHistory';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props {
    tournamentId: string;
    teamId?: string;
    matches: BracketMatch[];
    isOrganizer?: boolean;
    focusTeamIds?: string[];
    includeLiveMatchId?: string;
}

interface GameDetail {
    id: string;
    match_id: string;
    game_number: number;
    team1_score: number;
    team2_score: number;
    riot_match_id: string;
    map_id: string;
    map_name: string;
    map_image_url: string | null;
    match_details: any;
    reported_by_team_id?: string;
}

const resolveMapSplash = (mapName: string) => {
    const key = mapName.toLowerCase();
    const theme = MAP_THEMES[key];
    return theme ? getMapSplash(theme.id) : null;
};

const resolveMatchSide = (match: BracketMatch, teamId?: string): 'team1' | 'team2' | null => {
    if (!teamId) return null;
    if (match.team1?.id === teamId) return 'team1';
    if (match.team2?.id === teamId) return 'team2';
    return null;
};

const resolveOpponentName = (match: BracketMatch, teamId?: string): string => {
    const side = resolveMatchSide(match, teamId);
    const opponent = side === 'team1' ? match.team2 : side === 'team2' ? match.team1 : null;
    const opponentName = opponent?.name?.trim();
    if (opponentName && opponentName !== 'TBD') return opponentName;

    const fallback =
        side === 'team1' ? match.team2?.name
        : side === 'team2' ? match.team1?.name
        : undefined;
    if (fallback && fallback !== 'TBD') return fallback;

    return opponentName || 'TBD';
};

const GameRow: React.FC<{
    game: GameDetail;
    isTeam1: boolean;
    isExpanded: boolean;
    onToggle: () => void;
    team1Name: string;
    team2Name: string;
    teamId?: string;
    opposingTeamId?: string;
    matchTeam1Id?: string;
}> = ({ game, isTeam1, isExpanded, onToggle, team1Name, team2Name, teamId, opposingTeamId, matchTeam1Id }) => {
    const splash = resolveMapSplash(game.map_name);
    const myScore = isTeam1 ? game.team1_score : game.team2_score;
    const oppScore = isTeam1 ? game.team2_score : game.team1_score;
    const won = myScore > oppScore;

    return (
        <div className="border-t border-white/5">
            <button
                type="button"
                className="group flex w-full items-center justify-between gap-4 px-0 py-4 text-left transition-colors hover:bg-white/[0.02]"
                onClick={onToggle}
            >
                <div className="flex min-w-0 items-center gap-4">
                    {splash ? (
                        <div className="relative h-14 w-20 shrink-0 overflow-hidden border border-white/10">
                            <img src={splash} loading="lazy" alt="" className="h-full w-full object-cover opacity-70" />
                        </div>
                    ) : (
                        <div className="flex h-14 w-20 shrink-0 items-center justify-center border border-white/10 bg-white/[0.02] font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                            Map
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                            Game {game.game_number}
                        </p>
                        <p className="truncate font-heading text-lg font-bold uppercase tracking-tight text-white">
                            {game.map_name}
                        </p>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                    <div className="font-heading text-xl font-black tabular-nums text-white">
                        <span className={won ? 'text-white' : 'text-zinc-600'}>{myScore}</span>
                        <span className="mx-2 text-zinc-700">–</span>
                        <span className={!won && oppScore > myScore ? 'text-white' : 'text-zinc-600'}>{oppScore}</span>
                    </div>
                    {game.match_details?.players ? (
                        <ChevronDown className={cn('h-4 w-4 text-zinc-500 transition-transform', isExpanded && 'rotate-180')} />
                    ) : null}
                </div>
            </button>

            {isExpanded && game.match_details?.players ? (
                <div className="pb-5">
                    <div className="overflow-x-auto border border-white/5 bg-black/40 p-3">
                        <FullScoreboard
                            players={game.match_details.players}
                            team1Name={team1Name}
                            team2Name={team2Name}
                            team1Score={game.team1_score}
                            team2Score={game.team2_score}
                            reporterSide={game.match_details.reporterSide}
                            reportedByTeamId={game.reported_by_team_id || (isTeam1 ? teamId : opposingTeamId)}
                            team1Id={matchTeam1Id}
                            t1Side={game.match_details.t1Side}
                        />
                    </div>
                </div>
            ) : null}
        </div>
    );
};

const MatchVetoSummary: React.FC<{ matchId: string; expanded: boolean }> = ({ matchId, expanded }) => {
    const cleanedId = matchId.replace(/^(db-|wb-|lb-)/, '');
    const { data: entries = [], isLoading } = useVetoHistory(cleanedId, expanded);
    if (!expanded) return null;
    if (!isLoading && entries.length === 0) return null;

    return (
        <div className="border border-indigo-500/20 bg-indigo-500/5 p-4">
            <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-indigo-300">
                <Swords className="h-3.5 w-3.5" />
                Map veto timeline
            </p>
            <VetoHistoryTimeline entries={entries} loading={isLoading} compact />
        </div>
    );
};

const MatchStatsList: React.FC<{
    pastMatches: BracketMatch[];
    gameDetails: Record<string, GameDetail[]>;
    teamId?: string;
    isOrganizer?: boolean;
    expandedMatches: Record<string, boolean>;
    expandedGames: Record<string, boolean>;
    toggleMatch: (id: string) => void;
    toggleGame: (id: string) => void;
}> = ({
    pastMatches,
    gameDetails,
    teamId,
    isOrganizer,
    expandedMatches,
    expandedGames,
    toggleMatch,
    toggleGame,
}) => (
    <div className="divide-y divide-white/10 border-y border-white/10">
        {pastMatches.map((match) => {
            const side = resolveMatchSide(match, teamId);
            const isTeam1 = side === 'team1' || (isOrganizer && !teamId);
            const myScore = isTeam1 ? match.team1_score : match.team2_score;
            const opponentScore = isTeam1 ? match.team2_score : match.team1_score;
            const opponentName = resolveOpponentName(match, teamId);
            const isLive = match.status === 'in_progress';
            const isWin = !isLive && (myScore || 0) > (opponentScore || 0);
            const games = gameDetails[match.id] || [];
            const isExpanded = expandedMatches[match.id];

            const accentBarClass = isLive
                ? 'bg-amber-500/60'
                : isOrganizer
                    ? 'bg-zinc-600'
                    : isWin
                        ? 'bg-emerald-500/60'
                        : 'bg-rose-500/60';

            return (
                <article key={match.id} className="group">
                    <button
                        type="button"
                        className="flex w-full items-center justify-between gap-6 py-6 text-left transition-colors hover:bg-white/[0.02]"
                        onClick={() => toggleMatch(match.id)}
                    >
                        <div className="flex min-w-0 items-center gap-5">
                            <div className={cn('h-12 w-1 shrink-0', accentBarClass)} />
                            <div className="min-w-0">
                                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
                                    {isLive ? 'Current match' : `Match ${match.matchNumber}`}
                                </p>
                                <h3 className="mt-1 truncate font-heading text-xl font-bold uppercase tracking-tight text-white md:text-2xl">
                                    {isOrganizer
                                        ? `${match.team1?.name || 'Team 1'} vs ${match.team2?.name || 'Team 2'}`
                                        : `vs ${opponentName || 'TBD'}`}
                                </h3>
                                {games.length > 0 ? (
                                    <p className="mt-1 truncate text-xs text-zinc-600">
                                        {games.map((g) => g.map_name).join(' · ')}
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-4">
                            <Badge
                                variant="outline"
                                className={cn(
                                    'border-0 px-3 py-1 font-mono text-sm font-black tabular-nums',
                                    isLive
                                        ? 'bg-amber-500/10 text-amber-300'
                                        : isOrganizer
                                            ? 'bg-zinc-800 text-zinc-300'
                                            : isWin
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : 'bg-rose-500/10 text-rose-400',
                                )}
                            >
                                {myScore ?? 0} – {opponentScore ?? 0}
                            </Badge>
                            <ChevronDown className={cn('h-5 w-5 text-zinc-500 transition-transform', isExpanded && 'rotate-180')} />
                        </div>
                    </button>

                    {isExpanded ? (
                        <div className="border-t border-white/5 bg-black/20 px-0 pb-6 pt-2 md:pl-6">
                            {games.length === 0 ? (
                                <p className="py-4 text-center text-xs italic text-zinc-600">
                                    No detailed game data available.
                                </p>
                            ) : (
                                <div>
                                    {games.map((game) => (
                                        <GameRow
                                            key={game.id}
                                            game={game}
                                            isTeam1={isTeam1}
                                            isExpanded={!!expandedGames[game.id]}
                                            onToggle={() => toggleGame(game.id)}
                                            team1Name={match.team1?.name || 'Team 1'}
                                            team2Name={match.team2?.name || 'Team 2'}
                                            teamId={teamId}
                                            opposingTeamId={match.team2?.id}
                                            matchTeam1Id={match.team1?.id}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : null}
                </article>
            );
        })}
    </div>
);

const CaptainMatchHistory: React.FC<Props> = ({
    tournamentId,
    teamId,
    matches,
    isOrganizer,
    focusTeamIds,
    includeLiveMatchId,
}) => {
    const [expandedMatches, setExpandedMatches] = useState<Record<string, boolean>>({});
    const [expandedGames, setExpandedGames] = useState<Record<string, boolean>>({});

    const normalizeMatchId = (id: string) => id.replace(/^(db-|wb-|lb-)/, '');

    const involvesFocusedTeams = (match: BracketMatch) => {
        if (!focusTeamIds?.length) return true;
        return focusTeamIds.some(
            (id) => match.team1?.id === id || match.team2?.id === id,
        );
    };

    const isIncludedLiveMatch = (match: BracketMatch) =>
        !!includeLiveMatchId
        && normalizeMatchId(match.id) === normalizeMatchId(includeLiveMatchId);

    const pastMatches = matches.filter((m) => {
        if (isIncludedLiveMatch(m)) {
            return m.status === 'in_progress' || m.status === 'completed';
        }
        if (m.status !== 'completed') return false;
        if (isOrganizer) return involvesFocusedTeams(m);
        return !teamId || m.team1?.id === teamId || m.team2?.id === teamId;
    }).sort((a, b) => Number(b.matchNumber) - Number(a.matchNumber));

    const { data: rawGameDetails, isLoading: detailsLoading } = useQuery({
        queryKey: ['match-history-games', teamId, focusTeamIds?.join(','), includeLiveMatchId, pastMatches.map(m => m.id).join(',')],
        queryFn: async () => {
            if (pastMatches.length === 0) return {};
            const matchIdMap: Record<string, string> = {};
            pastMatches.forEach(m => {
                matchIdMap[m.id.replace(/^(db-|wb-|lb-)/, '')] = m.id;
            });

            const data = await apiClient.get<any[]>(
                `/api/tournaments/${tournamentId}/match-games?matchIds=${Object.keys(matchIdMap).join(',')}`
            );
            const grouped: Record<string, GameDetail[]> = {};

            data?.forEach((game: any) => {
                const prefixedId = matchIdMap[game.match_id];
                if (!prefixedId) return;
                if (!grouped[prefixedId]) grouped[prefixedId] = [];
                grouped[prefixedId].push({ ...game, map_name: game.map_name || 'Unknown Map', map_image_url: game.map_image_url || null });
            });
            return grouped;
        },
        enabled: pastMatches.length > 0,
    });

    const gameDetails = rawGameDetails || {};
    const toggleMatch = (id: string) => setExpandedMatches(prev => ({ ...prev, [id]: !prev[id] }));
    const toggleGame = (id: string) => setExpandedGames(prev => ({ ...prev, [id]: !prev[id] }));

    return (
        <div>
            <div className="mb-10 flex flex-col gap-4 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-emerald-400">Archive</p>
                    <h2 className="mt-2 font-heading text-3xl font-black uppercase tracking-tight text-white md:text-4xl">
                        Match history
                    </h2>
                </div>
                <p className="max-w-md text-sm text-zinc-500">
                    Series results, map breakdowns, and Riot-powered player statistics from completed and live matches.
                </p>
            </div>

            {detailsLoading && pastMatches.length > 0 && Object.keys(gameDetails).length === 0 ? (
                <div className="flex justify-center py-24">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                </div>
            ) : pastMatches.length === 0 ? (
                <div className="border border-dashed border-white/10 py-16 text-center text-zinc-500">
                    {isOrganizer ? 'No match history for these teams yet.' : 'No completed matches yet.'}
                </div>
            ) : (
                <Tabs defaultValue="veto" className="space-y-6">
                    <TabsList className="rounded-none border border-white/10 bg-black/40 p-1">
                        <TabsTrigger value="veto" className="rounded-none font-mono text-[10px] uppercase tracking-[0.22em]">
                            Map veto history
                        </TabsTrigger>
                        <TabsTrigger value="stats" className="rounded-none font-mono text-[10px] uppercase tracking-[0.22em]">
                            Match statistics
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="veto" className="mt-0">
                        <div className="space-y-4">
                            {pastMatches.map((match) => (
                                <article key={match.id} className="border border-white/10 bg-black/20 p-4">
                                    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                        <h3 className="font-heading text-lg font-bold uppercase tracking-tight text-white">
                                            {match.team1?.name || 'Team 1'} vs {match.team2?.name || 'Team 2'}
                                        </h3>
                                        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                                            Match {match.matchNumber}
                                        </span>
                                    </div>
                                    <MatchVetoSummary matchId={match.id} expanded />
                                </article>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="stats" className="mt-0">
                        <Tabs defaultValue="full" className="space-y-6">
                            <TabsList className="rounded-none border border-white/10 bg-black/30 p-1">
                                <TabsTrigger value="full" className="rounded-none font-mono text-[10px] uppercase tracking-[0.22em]">
                                    Full match data
                                </TabsTrigger>
                                <TabsTrigger value="scoreboard" className="rounded-none font-mono text-[10px] uppercase tracking-[0.22em]">
                                    Scoreboard
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="full" className="mt-0">
                                <MatchStatsList
                                    pastMatches={pastMatches}
                                    gameDetails={gameDetails}
                                    teamId={teamId}
                                    isOrganizer={isOrganizer}
                                    expandedMatches={expandedMatches}
                                    expandedGames={expandedGames}
                                    toggleMatch={toggleMatch}
                                    toggleGame={toggleGame}
                                />
                            </TabsContent>

                            <TabsContent value="scoreboard" className="mt-0">
                                <MatchStatsList
                                    pastMatches={pastMatches}
                                    gameDetails={gameDetails}
                                    teamId={teamId}
                                    isOrganizer={isOrganizer}
                                    expandedMatches={expandedMatches}
                                    expandedGames={expandedGames}
                                    toggleMatch={toggleMatch}
                                    toggleGame={toggleGame}
                                />
                            </TabsContent>
                        </Tabs>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
};

export default CaptainMatchHistory;
