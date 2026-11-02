import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Clock, Swords } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { RiotMatchCandidate } from '@/types/riotMatchCandidate';
import { useValorantMapCatalog } from '@/hooks/useValorantMapCatalog';
import { resolveMapSplash } from '@/services/maps/valorantMapAssets';
import { MAP_THEMES, getAgentIcon } from './fullScoreboardConstants';

interface RiotMatchCandidateListProps {
    candidates: RiotMatchCandidate[];
    submitting?: boolean;
    onSelect: (candidate: RiotMatchCandidate) => void;
    /** `neutral` drops the rose hover accents for surfaces without the tournament accent. */
    tone?: 'rose' | 'neutral';
    /** Narrow containers: the KDA column is dropped so the score and pick button always fit. */
    compact?: boolean;
}

/** Recent Riot games to pick a result from: agent, map art, KDA and score, as in the match room. */
export const RiotMatchCandidateList: React.FC<RiotMatchCandidateListProps> = ({
    candidates,
    submitting = false,
    onSelect,
    tone = 'rose',
    compact = false,
}) => {
    const neutral = tone === 'neutral';
    const catalog = useValorantMapCatalog(candidates.length > 0).data;
    const hoverBorder = neutral ? 'hover:border-white/30' : 'hover:border-rose-500/40 hover:shadow-rose-500/5';
    const tint = neutral ? 'from-white/10' : 'from-rose-500/10';
    const agentHover = neutral ? 'group-hover:border-white/30' : 'group-hover:border-rose-500/30';
    const pickHover = neutral
        ? 'group-hover:bg-white group-hover:border-white ring-transparent group-hover:ring-white/10'
        : 'group-hover:bg-rose-600 group-hover:border-rose-400 ring-transparent group-hover:ring-rose-500/10';
    const pickIcon = neutral ? 'group-hover:text-black' : 'group-hover:text-white';
    return (
            <div className="grid gap-4 max-h-[500px] overflow-y-auto overscroll-contain px-2 -mx-2 py-2 pb-10 custom-scrollbar scroll-smooth" data-lenis-prevent>
                <AnimatePresence mode="popLayout">
                    {candidates.map((match, idx) => {
                        const theme = MAP_THEMES[match.map.toLowerCase()] || { color: 'text-zinc-400', bg: 'bg-zinc-800', id: '' };
                        const splash = resolveMapSplash(match.map, match.mapId, catalog);
                        return (
                            <motion.div
                                key={match.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    delay: idx * 0.08,
                                    type: "spring",
                                    stiffness: 100,
                                    damping: 15
                                }}
                                onClick={() => !submitting && onSelect(match)}
                                className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-950/40 backdrop-blur-md ${hoverBorder} transition-all duration-300 cursor-pointer shadow-xl ${submitting ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                {/* Map Splash Background */}
                                {splash && (
                                    <div className="absolute inset-0 opacity-[0.07] group-hover:opacity-20 transition-opacity duration-700 pointer-events-none">
                                        <img
                                            src={splash}
                                            alt=""
                                            loading="lazy"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            className="w-full h-full object-cover grayscale brightness-150 scale-125 group-hover:scale-110 transition-transform duration-1000"
                                        />
                                        <div className={`absolute inset-0 bg-gradient-to-br ${tint} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                                    </div>
                                )}

                                {/* Background Glow */}
                                <div className={`absolute -right-8 -top-8 w-32 h-32 blur-[80px] opacity-0 group-hover:opacity-30 transition-opacity duration-500 ${match.result === 'Victory' ? 'bg-emerald-500' : 'bg-red-500'}`} />

                                <div className="relative p-5 sm:p-7 grid grid-cols-[auto,minmax(80px,1fr),auto,auto,auto] items-center gap-3 sm:gap-6 min-h-[120px]">
                                    {/* 1. Agent Display */}
                                    <div className="relative flex-shrink-0">
                                        <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 ${agentHover} transition-all duration-500 shadow-2xl shadow-black`}>
                                            {match.agent ? (
                                                <img src={getAgentIcon(match.agent)} loading="lazy" alt="Agent" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Swords className="w-6 h-6 text-zinc-800" />
                                                </div>
                                            )}
                                        </div>
                                        <div className={`absolute -top-1.5 -right-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center font-black text-[9px] sm:text-[10px] shadow-2xl border border-white/10 backdrop-blur-md ${match.result === 'Victory' ? 'bg-emerald-500/90 text-white' : 'bg-zinc-800/90 text-zinc-400'}`}>
                                            {match.result === 'Victory' ? 'W' : 'L'}
                                        </div>
                                    </div>

                                    {/* 2. Map Identity */}
                                    <div className="min-w-0 flex flex-col justify-center gap-1">
                                        <span className={`text-base sm:text-xl font-black uppercase tracking-tight transition-colors group-hover:text-white ${theme.color}`}>
                                            {match.map}
                                        </span>
                                        <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                            <Clock className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                                            {formatDistanceToNow(match.startTime)} ago
                                        </div>
                                    </div>

                                    {/* 3. Stats Column (Hidden on mobile) */}
                                    <div className={`${compact ? 'hidden' : 'hidden lg:flex'} flex-col items-center px-4 border-l border-white/5 min-w-[90px] whitespace-nowrap`}>
                                        <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-2 px-1 text-center opacity-40">KDA Stats</span>
                                        <div className="text-[11px] font-mono font-black flex items-center gap-1.5 leading-none">
                                            <span className="text-emerald-400">{match.kda.split('/')[0]}</span>
                                            <span className="text-zinc-700">/</span>
                                            <span className="text-rose-500">{match.kda.split('/')[1]}</span>
                                            <span className="text-zinc-700">/</span>
                                            <span className="text-zinc-400">{match.kda.split('/')[2]}</span>
                                        </div>
                                        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-2">{match.queueId || 'Custom'}</span>
                                    </div>

                                    {/* 4. Score Column */}
                                    <div className="flex flex-col items-center sm:px-6 border-l border-white/10 py-1 min-w-[110px] sm:min-w-[140px]">
                                        <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[.2em] sm:tracking-[.3em] mb-2 opacity-50 px-1 text-center">Scoreboard</span>
                                        <div className="flex items-center gap-3 sm:gap-5 leading-none">
                                            <span className={`text-2xl sm:text-4xl font-black tabular-nums tracking-tighter transition-all group-hover:scale-105 ${match.result === 'Victory' ? 'text-emerald-400' : 'text-white'}`}>{match.myTeamScore}</span>
                                            <div className="text-zinc-800 font-bold text-xl sm:text-2xl opacity-40">/</div>
                                            <span className={`text-2xl sm:text-4xl font-black tabular-nums tracking-tighter transition-all group-hover:scale-105 ${match.result === 'Victory' ? 'text-zinc-700' : 'text-rose-500'}`}>{match.enemyTeamScore}</span>
                                        </div>
                                    </div>

                                    {/* 5. Select Action */}
                                    <div className="flex-shrink-0 flex justify-end">
                                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center ${pickHover} transition-all duration-300 ring-4`}>
                                            <Check className={`w-4 h-4 sm:w-5 sm:h-5 text-zinc-600 ${pickIcon} transition-colors`} />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
    );
};
