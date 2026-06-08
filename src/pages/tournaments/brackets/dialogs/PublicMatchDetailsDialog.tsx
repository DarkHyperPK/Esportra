import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Eye, Bot, ChevronDown, Swords } from 'lucide-react';
import { FullScoreboard } from '@/components/tournament/FullScoreboard';
import { MAP_THEMES, getMapSplash } from '@/components/tournament/fullScoreboardConstants';
import { PublicVetoPreview } from '@/components/tournament/map-veto/PublicVetoPreview';
import { formatLocalTime } from '@/lib/timeUtils';
import EntityAvatar from '@/components/ui/EntityAvatar';
import { cn } from '@/lib/utils';
import type { BracketMatch } from '@/types/bracketTypes';
import type { MatchResult } from './MatchResultsDialog';

export interface PublicMatchDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    match: BracketMatch | null;
    results?: MatchResult[];
    automatedResults?: any[];
}

export const PublicMatchDetailsDialog: React.FC<PublicMatchDetailsDialogProps> = ({
    open,
    onOpenChange,
    match,
    results = [],
    automatedResults = [],
}) => {
    const [expandedGames, setExpandedGames] = useState<Record<string, boolean>>({});

    if (!match) return null;

    const getRawId = (id: string | number) => String(id).replace(/^(db-|wb-|lb-|source-)/, '');
    const isLive = match.status === 'live';
    const isCompleted = match.status === 'completed';
    const team1Won = match.winner?.id && match.winner.id === match.team1?.id;
    const team2Won = match.winner?.id && match.winner.id === match.team2?.id;
    const hasResults = results.length > 0 || automatedResults.length > 0;

    const toggleGame = (gameId: string) => {
        setExpandedGames(prev => ({ ...prev, [gameId]: !prev[gameId] }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[760px] bg-[#09090b] border border-zinc-800 max-h-[85vh] overflow-y-auto p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-zinc-800">
                    <DialogTitle className="text-white text-lg font-semibold">Match Details</DialogTitle>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {/* Teams & score */}
                    <div className="rounded-lg border border-white/10 bg-black/30 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <EntityAvatar
                                    src={match.team1?.logo_url}
                                    name={match.team1?.name || '?'}
                                    entityId={match.team1?.id}
                                    type="team"
                                    size="w-8 h-8"
                                />
                                <span className={cn('text-sm font-semibold truncate', team1Won ? 'text-white' : 'text-zinc-400')}>
                                    {match.team1?.name || 'TBD'}
                                </span>
                            </div>
                            <span className={cn('text-lg font-bold tabular-nums', team1Won ? 'text-rose-400' : 'text-zinc-500')}>
                                {match.team1_score ?? '-'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <EntityAvatar
                                    src={match.team2?.logo_url}
                                    name={match.team2?.name || '?'}
                                    entityId={match.team2?.id}
                                    type="team"
                                    size="w-8 h-8"
                                />
                                <span className={cn('text-sm font-semibold truncate', team2Won ? 'text-white' : 'text-zinc-400')}>
                                    {match.team2?.name || 'TBD'}
                                </span>
                            </div>
                            <span className={cn('text-lg font-bold tabular-nums', team2Won ? 'text-rose-400' : 'text-zinc-500')}>
                                {match.team2_score ?? '-'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-500 pt-1 border-t border-white/5">
                            <span className={cn(
                                'font-semibold uppercase',
                                isLive ? 'text-rose-400' : isCompleted ? 'text-zinc-400' : 'text-zinc-500',
                            )}>
                                {isLive ? 'Live' : isCompleted ? 'Completed' : match.status || 'Pending'}
                            </span>
                            {match.scheduledTime && (
                                <span>{formatLocalTime(match.scheduledTime, 'MMM d • h:mm a')}</span>
                            )}
                        </div>
                    </div>

                    {/* Map veto preview */}
                    <div>
                        <h3 className="text-xs font-black text-white/60 uppercase tracking-widest mb-3">Map Veto</h3>
                        <PublicVetoPreview
                            matchId={getRawId(match.id)}
                            team1Name={match.team1?.name}
                            team2Name={match.team2?.name}
                            enabled={open}
                        />
                    </div>

                    {/* Match results */}
                    {hasResults ? (
                        <div className="space-y-4">
                            {automatedResults.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                                        {automatedResults.some(g => g.match_details?.players) ? (
                                            <><Bot className="w-4 h-4 text-rose-400" />Official Game Data</>
                                        ) : (
                                            <><Swords className="w-4 h-4 text-zinc-400" />Manual Breakdown</>
                                        )}
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3">
                                        {automatedResults.map((game: any, idx: number) => {
                                            const gameId = game.id || `game-${idx}`;
                                            const mapName = game.map_name || game.mapName || 'Unknown Map';
                                            const theme = MAP_THEMES[mapName] || MAP_THEMES.default;
                                            const splash = getMapSplash(mapName);
                                            const isExpanded = expandedGames[gameId];

                                            return (
                                                <div key={gameId} className="rounded-lg border border-white/10 overflow-hidden">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleGame(gameId)}
                                                        className="w-full flex items-center justify-between p-3 bg-black/40 hover:bg-black/60 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className="w-12 h-8 rounded bg-cover bg-center border border-white/10"
                                                                style={{ backgroundImage: `url(${splash})` }}
                                                            />
                                                            <div className="text-left">
                                                                <p className="text-sm font-semibold text-white">{mapName}</p>
                                                                <p className="text-xs text-zinc-500">
                                                                    {game.team1_score ?? '-'} — {game.team2_score ?? '-'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <ChevronDown className={cn('w-4 h-4 text-zinc-500 transition-transform', isExpanded && 'rotate-180')} />
                                                    </button>
                                                    {isExpanded && game.match_details?.players && (
                                                        <div className="p-3 border-t border-white/10">
                                                            <FullScoreboard
                                                                matchDetails={game.match_details}
                                                                mapTheme={theme}
                                                                team1Name={match.team1?.name || 'Team 1'}
                                                                team2Name={match.team2?.name || 'Team 2'}
                                                                team1Id={match.team1?.id}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {results.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                                        <Eye className="w-4 h-4 text-zinc-400" />
                                        Submitted Evidence
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {results.filter(r => r.image_url).map((r, i) => (
                                            <a
                                                key={i}
                                                href={r.image_url!}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="rounded-lg border border-white/10 overflow-hidden hover:border-rose-500/30 transition-colors"
                                            >
                                                <img src={r.image_url!} alt="Match proof" className="w-full h-32 object-cover" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-zinc-500">No match results recorded yet.</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PublicMatchDetailsDialog;
