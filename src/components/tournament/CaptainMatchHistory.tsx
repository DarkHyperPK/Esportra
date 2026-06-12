import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ChevronRight, Loader2, Swords } from 'lucide-react';
import type { ScoreboardPlayer } from '@/types/scoreboardPlayer';
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

interface MatchDetailsPayload {
    players?: ScoreboardPlayer[];
    blueTeam?: { roundsWon: number; won: boolean };
    redTeam?: { roundsWon: number; won: boolean };
    queueId?: string;
    gameLengthMillis?: number;
    startTime?: number;
    reporterResult?: string;
    reporterKda?: string;
    reporterSide?: 'Blue' | 'Red';
    reportedByTeamId?: string;
    t1Side?: 'Blue' | 'Red';
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
    match_details: MatchDetailsPayload | null;
    reported_by_team_id?: string;
}

const formatGameDuration = (ms?: number) => {
    if (!ms || ms <= 0) return null;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const formatStartTime = (ms?: number) => {
    if (!ms) return null;
    return new Date(ms).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

const sortGames = (games: GameDetail[]) =>
    [...games].sort((left, right) => left.game_number - right.game_number);

const normalizeMatchDetails = (raw: unknown): MatchDetailsPayload | null => {
    if (!raw) return null;
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw) as MatchDetailsPayload;
        } catch {
            return null;
        }
    }
    if (typeof raw === 'object') return raw as MatchDetailsPayload;
    return null;
};

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

const MatchGamePreviewRow: React.FC<{
    game: GameDetail;
}> = ({ game }) => {
    const splash = resolveMapSplash(game.map_name);

    return (
        <div className="flex items-center justify-between gap-3 border border-white/5 bg-black/30 px-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
                {splash ? (
                    <div className="relative h-10 w-14 shrink-0 overflow-hidden border border-white/10">
                        <img src={splash} loading="lazy" alt="" className="h-full w-full object-cover opacity-70" />
                    </div>
                ) : null}
                <div className="min-w-0">
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-zinc-500">
                        Game {game.game_number}
                    </p>
                    <p className="truncate text-sm font-semibold text-zinc-200">{game.map_name}</p>
                </div>
            </div>
            <p className="shrink-0 font-mono text-sm font-bold tabular-nums text-white">
                {game.team1_score} – {game.team2_score}
            </p>
        </div>
    );
};

const MatchStatisticsList: React.FC<{
    pastMatches: BracketMatch[];
    gameDetails: Record<string, GameDetail[]>;
    teamId?: string;
    isOrganizer?: boolean;
    onSelectMatch: (matchId: string) => void;
}> = ({ pastMatches, gameDetails, teamId, isOrganizer, onSelectMatch }) => (
    <div className="divide-y divide-white/10 border-y border-white/10">
        {pastMatches.map((match) => {
            const side = resolveMatchSide(match, teamId);
            const isTeam1 = side === 'team1' || (isOrganizer && !teamId);
            const myScore = isTeam1 ? match.team1_score : match.team2_score;
            const opponentScore = isTeam1 ? match.team2_score : match.team1_score;
            const opponentName = resolveOpponentName(match, teamId);
            const isLive = match.status === 'in_progress';
            const isWin = !isLive && (myScore || 0) > (opponentScore || 0);
            const games = sortGames(gameDetails[match.id] || []);
            const multiGame = games.length > 1;

            const accentBarClass = isLive
                ? 'bg-amber-500/60'
                : isOrganizer
                    ? 'bg-zinc-600'
                    : isWin
                        ? 'bg-emerald-500/60'
                        : 'bg-rose-500/60';

            return (
                <button
                    key={match.id}
                    type="button"
                    className="group flex w-full flex-col gap-4 py-6 text-left transition-colors hover:bg-white/[0.02]"
                    onClick={() => onSelectMatch(match.id)}
                >
                    <div className="flex w-full items-center justify-between gap-6">
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
                                {!multiGame && games.length === 1 ? (
                                    <p className="mt-1 truncate text-xs text-zinc-600">{games[0].map_name}</p>
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
                            <ChevronRight className="h-5 w-5 text-zinc-500 transition-transform group-hover:translate-x-0.5" />
                        </div>
                    </div>

                    {multiGame ? (
                        <div className="space-y-2 pl-6 md:pl-7">
                            {games.map((game) => (
                                <MatchGamePreviewRow key={game.id} game={game} />
                            ))}
                        </div>
                    ) : null}
                </button>
            );
        })}
    </div>
);

const resolveReporterTeamName = (
    details: MatchDetailsPayload | null,
    game: GameDetail,
    team1Name: string,
    team2Name: string,
    team1Id?: string,
    team2Id?: string,
): string | null => {
    const reporterTeamId = game.reported_by_team_id || details?.reportedByTeamId;
    if (reporterTeamId && team1Id && String(reporterTeamId).toLowerCase() === String(team1Id).toLowerCase()) {
        return team1Name;
    }
    if (reporterTeamId && team2Id && String(reporterTeamId).toLowerCase() === String(team2Id).toLowerCase()) {
        return team2Name;
    }
    if (details?.reporterSide && details?.t1Side) {
        return details.reporterSide === details.t1Side ? team1Name : team2Name;
    }
    return null;
};

const FullMatchDataPanel: React.FC<{
    game: GameDetail;
    team1Name: string;
    team2Name: string;
    team1Id?: string;
    team2Id?: string;
}> = ({ game, team1Name, team2Name, team1Id, team2Id }) => {
    const details = game.match_details;
    const splash = resolveMapSplash(game.map_name);
    const duration = formatGameDuration(details?.gameLengthMillis);
    const startedAt = formatStartTime(details?.startTime);
    const reporterTeamName = resolveReporterTeamName(details, game, team1Name, team2Name, team1Id, team2Id);
    const hasMetadata = Boolean(
        game.riot_match_id
        || duration
        || startedAt
        || reporterTeamName,
    );

    return (
        <div className="space-y-6">
            <div className="overflow-hidden border border-white/10 bg-black/30">
                {splash ? (
                    <div className="relative h-36 overflow-hidden">
                        <img src={splash} loading="lazy" alt="" className="h-full w-full object-cover opacity-50" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-[#08080a]/70 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-5">
                            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-400">
                                Game {game.game_number}
                            </p>
                            <h3 className="font-heading text-2xl font-black uppercase tracking-tight text-white">
                                {game.map_name}
                            </h3>
                        </div>
                    </div>
                ) : (
                    <div className="border-b border-white/10 p-5">
                        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-400">
                            Game {game.game_number}
                        </p>
                        <h3 className="font-heading text-2xl font-black uppercase tracking-tight text-white">
                            {game.map_name}
                        </h3>
                    </div>
                )}

                {hasMetadata ? (
                    <div className="grid gap-4 p-5 sm:grid-cols-2">
                        {game.riot_match_id ? (
                            <div>
                                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-zinc-500">Riot match ID</p>
                                <p className="mt-1 break-all font-mono text-xs text-zinc-300">{game.riot_match_id}</p>
                            </div>
                        ) : null}
                        {duration ? (
                            <div>
                                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-zinc-500">Duration</p>
                                <p className="mt-1 text-sm font-semibold text-white">{duration}</p>
                            </div>
                        ) : null}
                        {startedAt ? (
                            <div>
                                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-zinc-500">Played at</p>
                                <p className="mt-1 text-sm font-semibold text-white">{startedAt}</p>
                            </div>
                        ) : null}
                        {reporterTeamName ? (
                            <div>
                                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-zinc-500">Reported by</p>
                                <p className="mt-1 text-sm font-semibold text-white">{reporterTeamName}</p>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="border-t border-white/5 px-5 py-8 text-center text-sm text-zinc-500">
                        No automated Riot payload for this game. Only the submitted map score is available.
                    </div>
                )}
            </div>
        </div>
    );
};

const MatchStatisticsDetail: React.FC<{
    match: BracketMatch;
    games: GameDetail[];
    teamId?: string;
    isOrganizer?: boolean;
    onBack: () => void;
}> = ({ match, games, teamId, isOrganizer, onBack }) => {
    const sortedGames = sortGames(games);
    const [selectedGameId, setSelectedGameId] = useState<string>(() => sortedGames[0]?.id ?? '');
    const side = resolveMatchSide(match, teamId);
    const isTeam1 = side === 'team1' || (isOrganizer && !teamId);
    const opponentName = resolveOpponentName(match, teamId);
    const selectedGame = sortedGames.find((game) => game.id === selectedGameId) ?? sortedGames[0];

    if (!selectedGame) {
        return (
            <div className="space-y-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-400 transition-colors hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to matches
                </button>
                <div className="border border-dashed border-white/10 py-16 text-center text-sm text-zinc-500">
                    No detailed game data available for this match.
                </div>
            </div>
        );
    }

    const team1Name = match.team1?.name || 'Team 1';
    const team2Name = match.team2?.name || 'Team 2';
    const hasScoreboard = (selectedGame.match_details?.players?.length ?? 0) > 0;

    return (
        <div className="space-y-6">
            <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-400 transition-colors hover:text-white"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to matches
            </button>

            <div className="border-b border-white/10 pb-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
                    Match {match.matchNumber}
                </p>
                <h3 className="mt-1 font-heading text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">
                    {isOrganizer
                        ? `${team1Name} vs ${team2Name}`
                        : `vs ${opponentName || 'TBD'}`}
                </h3>
                <p className="mt-2 font-mono text-sm font-black tabular-nums text-zinc-300">
                    {match.team1_score ?? 0} – {match.team2_score ?? 0}
                </p>
            </div>

            {sortedGames.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                    {sortedGames.map((game) => (
                        <button
                            key={game.id}
                            type="button"
                            onClick={() => setSelectedGameId(game.id)}
                            className={cn(
                                'border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors',
                                selectedGame.id === game.id
                                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                                    : 'border-white/10 bg-black/20 text-zinc-400 hover:border-white/20 hover:text-white',
                            )}
                        >
                            Game {game.game_number} · {game.map_name}
                        </button>
                    ))}
                </div>
            ) : null}

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
                    <FullMatchDataPanel
                        game={selectedGame}
                        team1Name={team1Name}
                        team2Name={team2Name}
                        team1Id={match.team1?.id}
                        team2Id={match.team2?.id}
                    />
                </TabsContent>

                <TabsContent value="scoreboard" className="mt-0">
                    {hasScoreboard ? (
                        <div className="overflow-x-auto border border-white/10 bg-black/40 p-3">
                            <FullScoreboard
                                players={selectedGame.match_details?.players}
                                team1Name={team1Name}
                                team2Name={team2Name}
                                team1Score={selectedGame.team1_score}
                                team2Score={selectedGame.team2_score}
                                reporterSide={selectedGame.match_details?.reporterSide}
                                reportedByTeamId={
                                    selectedGame.reported_by_team_id
                                    || selectedGame.match_details?.reportedByTeamId
                                    || (isTeam1 ? teamId : match.team2?.id)
                                }
                                team1Id={match.team1?.id}
                                t1Side={selectedGame.match_details?.t1Side}
                            />
                        </div>
                    ) : (
                        <div className="border border-dashed border-white/10 py-16 text-center text-sm text-zinc-500">
                            No player scoreboard data for this game yet.
                        </div>
                    )}
                </TabsContent>
            </Tabs>
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

const CaptainMatchHistory: React.FC<Props> = ({
    tournamentId,
    teamId,
    matches,
    isOrganizer,
    focusTeamIds,
    includeLiveMatchId,
}) => {
    const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

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
                grouped[prefixedId].push({
                    ...game,
                    map_name: game.map_name || 'Unknown Map',
                    map_image_url: game.map_image_url || null,
                    match_details: normalizeMatchDetails(game.match_details),
                });
            });
            return grouped;
        },
        enabled: pastMatches.length > 0,
    });

    const gameDetails = rawGameDetails || {};
    const selectedMatch = selectedMatchId
        ? pastMatches.find((match) => match.id === selectedMatchId) ?? null
        : null;

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
                        {selectedMatch ? (
                            <MatchStatisticsDetail
                                key={selectedMatch.id}
                                match={selectedMatch}
                                games={gameDetails[selectedMatch.id] || []}
                                teamId={teamId}
                                isOrganizer={isOrganizer}
                                onBack={() => setSelectedMatchId(null)}
                            />
                        ) : (
                            <MatchStatisticsList
                                pastMatches={pastMatches}
                                gameDetails={gameDetails}
                                teamId={teamId}
                                isOrganizer={isOrganizer}
                                onSelectMatch={setSelectedMatchId}
                            />
                        )}
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
};

export default CaptainMatchHistory;
