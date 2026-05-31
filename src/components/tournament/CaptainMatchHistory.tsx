import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, ChevronDown, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { BracketMatch } from '@/types/bracketTypes';
import { apiClient } from '@/lib/apiClient';
import { FullScoreboard } from './FullScoreboard';
import { MAP_THEMES, getMapSplash } from './fullScoreboardConstants';

interface Props {
    tournamentId: string;
    teamId?: string;
    matches: BracketMatch[];
    isOrganizer?: boolean;
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
    match_details: any; // Riot API scoreboard data — shape varies per match
    reported_by_team_id?: string;
}

const resolveMapSplash = (mapName: string) => {
    const key = mapName.toLowerCase();
    const theme = MAP_THEMES[key];
    return theme ? getMapSplash(theme.id) : null;
};

/** Individual game row with map splash + expandable scoreboard */
const GameCard: React.FC<{
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
    const [splashLoaded, setSplashLoaded] = useState(false);
    const handleSplashLoad = useCallback(() => setSplashLoaded(true), []);

    return (
        <div className="space-y-2">
            <div
                className="relative group/game flex items-center justify-between border border-white/5 rounded-xl overflow-hidden cursor-pointer hover:border-white/20 transition-all min-h-[80px]"
                onClick={onToggle}
            >
                {splash && (
                    <div className="absolute inset-0 z-0">
                        <img src={splash} loading="lazy" alt="" onLoad={handleSplashLoad} className={`w-full h-full object-cover transition-opacity duration-500 ${splashLoaded ? 'opacity-40 group-hover/game:opacity-60' : 'opacity-0'}`} />
                        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/40 to-transparent" />
                    </div>
                )}
                <div className="relative z-10 flex flex-col p-5">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1 drop-shadow-md">Game {game.game_number}</span>
                    <span className="text-lg font-black text-white uppercase tracking-tight drop-shadow-lg">{game.map_name}</span>
                </div>
                <div className="relative z-10 flex items-center gap-4 p-5">
                    <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-2xl">
                        <span className={`text-base font-black ${myScore > oppScore ? 'text-white' : 'text-zinc-500'}`}>{myScore}</span>
                        <span className="text-xs text-zinc-700 font-bold">VS</span>
                        <span className={`text-base font-black ${oppScore > myScore ? 'text-white' : 'text-zinc-500'}`}>{oppScore}</span>
                    </div>
                    {game.match_details?.players && (
                        <div className={`p-2 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDown className="w-4 h-4 text-white" />
                        </div>
                    )}
                </div>
            </div>
            {isExpanded && game.match_details?.players && (
                <div className="bg-zinc-950/40 backdrop-blur-md rounded-xl border border-white/5 overflow-hidden p-2 animate-in fade-in slide-in-from-top-2 duration-300">
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
            )}
        </div>
    );
};

const CaptainMatchHistory: React.FC<Props> = ({ tournamentId, teamId, matches, isOrganizer }) => {
    const [expandedMatches, setExpandedMatches] = useState<Record<string, boolean>>({});
    const [expandedGames, setExpandedGames] = useState<Record<string, boolean>>({});

    // Organizer mode: show all completed matches. Team mode: show only team's matches.
    const pastMatches = matches.filter(m =>
        m.status === 'completed' && (isOrganizer || !teamId || m.team1?.id === teamId || m.team2?.id === teamId)
    ).sort((a, b) => Number(b.matchNumber) - Number(a.matchNumber));

    const { data: rawGameDetails, isLoading: detailsLoading } = useQuery({
        queryKey: ['match-history-games', teamId, pastMatches.map(m => m.id).join(',')],
        queryFn: async () => {
            if (pastMatches.length === 0) return {};
            const matchIdMap: Record<string, string> = {};
            pastMatches.forEach(m => {
                matchIdMap[m.id.replace(/^(db-|wb-|lb-)/, '')] = m.id;
            });
             
            const data = await apiClient.get<any[]>( // API returns dynamic jsonb columns
                `/api/tournaments/${tournamentId}/match-games?matchIds=${Object.keys(matchIdMap).join(',')}`
            );
            const grouped: Record<string, GameDetail[]> = {};
             
            data?.forEach((game: any) => { // API returns dynamic jsonb columns
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
        <div className="mt-8 max-w-2xl mx-auto">
            <Card className="bg-[#18181b] border-zinc-800 shadow-2xl rounded-3xl overflow-hidden">
                <CardHeader className="border-b border-white/5 pb-4 bg-white/5">
                    <CardTitle className="text-lg font-heading text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-500" />
                        Match History
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <ScrollArea className="h-[450px] pr-4">
                        {detailsLoading && pastMatches.length > 0 && Object.keys(gameDetails).length === 0 ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                            </div>
                        ) : pastMatches.length === 0 ? (
                            <div className="text-center text-zinc-500 py-12">No completed matches yet.</div>
                        ) : (
                            <div className="space-y-4">
                                {pastMatches.map(match => {
                                    const isTeam1 = match.team1?.id === teamId;
                                    const myScore = isTeam1 ? match.team1_score : match.team2_score;
                                    const opponentScore = isTeam1 ? match.team2_score : match.team1_score;
                                    const opponentName = isTeam1 ? match.team2?.name : match.team1?.name;
                                    const isWin = (myScore || 0) > (opponentScore || 0);
                                    const games = gameDetails[match.id] || [];
                                    const isExpanded = expandedMatches[match.id];

                                    return (
                                        <div key={match.id} className="rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all overflow-hidden">
                                            <div className="relative flex items-center justify-between p-4 cursor-pointer group overflow-hidden" onClick={() => toggleMatch(match.id)}>
                                                {games.length > 0 && (
                                                    <div className="absolute inset-0 z-0">
                                                        <img src={resolveMapSplash(games[0].map_name) || ''} loading="lazy" alt="" className="w-full h-full object-cover opacity-0 group-hover:opacity-30 transition-opacity duration-500" onLoad={(e) => { (e.target as HTMLImageElement).classList.replace('opacity-0', 'opacity-20'); }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/70 to-zinc-950/50" />
                                                    </div>
                                                )}
                                                <div className="relative z-10 flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${isWin ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'}`}>
                                                        {isWin ? 'W' : 'L'}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-zinc-100 group-hover:text-white transition-colors">
                                                            {isOrganizer ? `${match.team1?.name || 'Team 1'} vs ${match.team2?.name || 'Team 2'}` : `vs ${opponentName || 'TBD'}`}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Match #{match.matchNumber}</span>
                                                            {games.length > 0 && <span className="text-[10px] text-zinc-600">· {games.map(g => g.map_name).join(', ')}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="relative z-10 flex items-center gap-3">
                                                    <Badge variant="outline" className={`border-0 font-mono font-black text-sm px-3 py-1 ${isWin ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                        {myScore} – {opponentScore}
                                                    </Badge>
                                                    <div className={`p-1.5 rounded-lg bg-white/5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                                        <ChevronDown className="w-4 h-4 text-zinc-500" />
                                                    </div>
                                                </div>
                                            </div>
                                            {isExpanded && (
                                                <div className="px-4 pb-4 border-t border-white/5 bg-black/20">
                                                    <div className="pt-4 space-y-3">
                                                        {games.length === 0 ? (
                                                            <p className="text-center text-xs text-zinc-600 italic py-2">No detailed game data available.</p>
                                                        ) : games.map(game => (
                                                            <GameCard
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
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};

export default CaptainMatchHistory;
