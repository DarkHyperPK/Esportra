import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Eye, Bot, ChevronDown, Swords } from 'lucide-react';
import { MAP_THEMES, getMapSplash, FullScoreboard } from '@/components/tournament/FullScoreboard';
import { cn } from '@/lib/utils';

export interface MatchResult {
    image_url: string | null;
    comment: string | null;
    created_at: string;
    reporter_user_id: string;
}

export interface MatchResultsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    results: MatchResult[];
    automatedResults?: any[];
    team1Name?: string;
    team2Name?: string;
    team1Id?: string;
}

export const MatchResultsDialog: React.FC<MatchResultsDialogProps> = ({
    open,
    onOpenChange,
    results,
    automatedResults = [],
    team1Name = 'Team 1',
    team2Name = 'Team 2',
    team1Id
}) => {
    const [expandedGames, setExpandedGames] = useState<Record<string, boolean>>({});

    const toggleGame = (gameId: string) => {
        setExpandedGames(prev => ({ ...prev, [gameId]: !prev[gameId] }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[720px] bg-[#0a0a0c] border border-white/10/40 max-h-[85vh] overflow-y-auto p-0">
                <div className="p-6">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            Match Results
                            {automatedResults.some(g => g.match_details?.players) && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 font-medium">
                                    <Bot className="w-3 h-3" />
                                    Automated Fetch
                                </div>
                            )}
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            View official game data and team-submitted evidence.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-8 mt-6">
                        {/* section: Automated/Official Results */}
                        {automatedResults.length > 0 && (
                            <div className="space-y-3">
                                {automatedResults.some(g => g.match_details?.players) ? (
                                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                                        <Bot className="w-4 h-4 text-blue-400" />
                                        Official Game Data
                                    </h3>
                                ) : (
                                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                                        <Swords className="w-4 h-4 text-zinc-400" />
                                        Manual Breakdown
                                    </h3>
                                )}
                                <div className="grid grid-cols-1 gap-4">
                                    {automatedResults.map((game, i) => {
                                        const isManual = game.map_name === 'Manual Result' || !game.match_details?.players;

                                        // Try to find map name by ID if the name is missing/generic
                                        let mapName = game.map_name;
                                        let mapTheme = MAP_THEMES[mapName?.toLowerCase()];

                                        if (!mapTheme && game.map_id) {
                                            const themeEntry = Object.entries(MAP_THEMES).find(([_, v]) => v.id === game.map_id);
                                            if (themeEntry) {
                                                mapName = themeEntry[0].charAt(0).toUpperCase() + themeEntry[0].slice(1);
                                                mapTheme = themeEntry[1];
                                            }
                                        }

                                        const riotMapId = mapTheme?.id || game.map_id;
                                        const isExpanded = expandedGames[game.id];
                                        const hasScoreboard = game.match_details?.players?.length > 0;

                                        return (
                                            <div key={i} className="space-y-2">
                                                <div
                                                    className={cn(
                                                        "relative group/game flex items-center justify-between border border-white/5 rounded-xl overflow-hidden min-h-[80px] transition-all",
                                                        hasScoreboard ? "cursor-pointer hover:border-blue-500/30" : "cursor-default"
                                                    )}
                                                    onClick={() => hasScoreboard && toggleGame(game.id)}
                                                >
                                                    {/* Map Splash Background - Only for real maps */}
                                                    {!isManual && (
                                                        <div className="absolute inset-0 z-0">
                                                            {riotMapId && (
                                                                <img
                                                                    src={getMapSplash(riotMapId)}
                                                                    alt=""
                                                                    className="w-full h-full object-cover opacity-30 group-hover/game:opacity-40 transition-opacity"
                                                                />
                                                            )}
                                                            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/60 to-transparent" />
                                                        </div>
                                                    )}

                                                    {/* Manual Result Background */}
                                                    {isManual && (
                                                        <div className="absolute inset-0 z-0 bg-zinc-900/50" />
                                                    )}

                                                    <div className="relative z-10 flex items-center gap-4 p-5">
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-full flex items-center justify-center font-bold border backdrop-blur-sm",
                                                            isManual ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                                        )}>
                                                            {i + 1}
                                                        </div>
                                                        <div>
                                                            <div className={cn(
                                                                "text-[10px] font-black uppercase tracking-widest mb-0.5",
                                                                isManual ? "text-zinc-500" : "text-blue-400"
                                                            )}>
                                                                Game {game.game_number}
                                                            </div>
                                                            <div className="text-lg font-black text-white uppercase tracking-tight">
                                                                {isManual ? 'Match Summary' : (mapName || 'Unknown Map')}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="relative z-10 flex items-center gap-6 p-5">
                                                        <div className="text-right">
                                                            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Score</div>
                                                            <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-2xl">
                                                                <span className={game.team1_score > game.team2_score ? "text-white font-black text-lg" : "text-zinc-500 font-black text-lg"}>
                                                                    {game.team1_score}
                                                                </span>
                                                                <span className="text-zinc-700 font-bold text-xs">VS</span>
                                                                <span className={game.team2_score > game.team1_score ? "text-white font-black text-lg" : "text-zinc-500 font-black text-lg"}>
                                                                    {game.team2_score}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {hasScoreboard && (
                                                            <div className={`p-2 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                                                <ChevronDown className="w-4 h-4 text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Scoreboard Section */}
                                                {isExpanded && hasScoreboard && (
                                                    <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/5 overflow-hidden p-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <FullScoreboard
                                                            players={game.match_details.players}
                                                            team1Name={team1Name}
                                                            team2Name={team2Name}
                                                            team1Score={game.team1_score}
                                                            team2Score={game.team2_score}
                                                            reporterSide={game.match_details.reporterSide}
                                                            reportedByTeamId={game.match_details.reportedByTeamId}
                                                            team1Id={team1Id}
                                                            t1Side={game.match_details.t1Side}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* section: Manual Proofs */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                                <Eye className="w-4 h-4 text-gray-400" />
                                Submitted Evidence
                            </h3>
                            {results.length === 0 ? (
                                <div className="text-gray-500 text-sm italic bg-black/20 rounded-lg p-4 border border-white/5">
                                    No images or comments submitted by teams.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {results.map((r, i) => (
                                        <div key={i} className="bg-zinc-800/20 rounded border border-white/10/30 overflow-hidden group hover:border-white/10/50 transition-colors">
                                            {r.image_url ? (
                                                <a href={r.image_url} target="_blank" rel="noopener noreferrer" className="block relative aspect-video bg-black/40">
                                                    <img src={r.image_url} loading="lazy" alt="result" className="w-full h-full object-contain" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                        <span className="text-white text-xs font-medium">View Full Image</span>
                                                    </div>
                                                </a>
                                            ) : (
                                                <div className="w-full aspect-video flex items-center justify-center text-xs text-gray-500 bg-black/20">No image</div>
                                            )}
                                            <div className="p-3 bg-black/20">
                                                <div className="text-[10px] text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
                                                {r.comment && <div className="text-xs text-gray-300 mt-2 whitespace-pre-wrap leading-relaxed">{r.comment}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default MatchResultsDialog;

