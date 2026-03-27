import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Crown, ChevronDown, Users, Flame, Target, Award, TrendingUp, Swords, Star } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { getCountryFlagUrl } from '@/utils/countries';
import { Globe } from 'lucide-react';
import EntityAvatar from '@/components/ui/EntityAvatar';
import { isBattleRoyale } from '@/utils/gameFeatures';
import { useQuery } from '@tanstack/react-query';

// ── Types ──
interface TeamStats {
    id: string;
    name: string;
    logo_url: string | null;
    country_code: string | null;
    matches_played: number;
    wins: number;
    losses: number;
    win_rate: number;
    tournaments_won: number;
    rp: number;
}

interface LeaderboardFilters {
    games: string[];
    countries: string[];
}

// ── Constants ──
const RP_PER_WIN = 50;
const RP_PER_LOSS = -10;
const RP_PER_TOURNAMENT_WIN = 500;
const RP_PER_MVP = 25;

const RANK_COLORS = [
    'from-yellow-400 to-amber-500',   // 1st
    'from-zinc-300 to-zinc-400',      // 2nd
    'from-amber-600 to-amber-700',    // 3rd
];

const RANK_ICONS = [Crown, Medal, Award];

// ── Page Component ──
const Leaderboards: React.FC = () => {
    const [game, setGame] = useState('');
    const [gameMenuOpen, setGameMenuOpen] = useState(false);
    const [teams, setTeams] = useState<TeamStats[]>([]);
    const [country, setCountry] = useState('');
    const [countryMenuOpen, setCountryMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetch filter options (only games/countries with actual leaderboard data)
    const { data: filterOptions } = useQuery<LeaderboardFilters>({
        queryKey: ['leaderboard-filters'],
        queryFn: () => apiClient.get<LeaderboardFilters>('/api/leaderboards/filters'),
        staleTime: 5 * 60 * 1000,
    });

    // ── Fetch Team Leaderboard ──
    useEffect(() => {
        setLoading(true);

        const fetchTeams = async () => {
            try {
                const params = new URLSearchParams();
                if (game) params.set('game', game);
                if (country) params.set('country', country);
                const queryStr = params.toString() ? `?${params.toString()}` : '';
                const stats = await apiClient.get<TeamStats[]>(`/api/leaderboards/teams${queryStr}`);
                setTeams(stats || []);
            } catch (err) {
                console.error('Leaderboard fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchTeams();
    }, [game, country]);

    const data = teams;

    return (
        <div className="min-h-screen pb-20">
            {/* Hero Header */}
            <div className="relative overflow-hidden pt-10 pb-16 px-4">
                <div className="absolute inset-0 bg-gradient-to-b from-rose-500/10 via-rose-500/5 to-transparent pointer-events-none" />
                <div className="relative z-10 max-w-5xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="inline-flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-full px-4 py-1.5 mb-6">
                            <Trophy className="w-4 h-4 text-rose-400" />
                            <span className="text-xs font-bold uppercase tracking-widest text-rose-300">Rankings</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-none mb-4">
                            Leader<span className="bg-gradient-to-r from-rose-400 to-cyan-400 bg-clip-text text-transparent">boards</span>
                        </h1>
                        <p className="text-zinc-500 text-sm sm:text-base max-w-md mx-auto">
                            See who dominates the competition. Rankings based on match wins, tournament victories, and MVP performances.
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Controls */}
            <div className="max-w-5xl mx-auto px-4 mb-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Teams Label */}
                    <div className="flex items-center bg-zinc-900/60 border border-white/10 rounded-2xl p-1 backdrop-blur-md">
                        <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-rose-600 text-white shadow-lg shadow-rose-500/20">
                            <Users className="w-3.5 h-3.5" />
                            Teams
                        </div>
                    </div>

                    {/* Game Filter Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => { setGameMenuOpen(!gameMenuOpen); setCountryMenuOpen(false); }}
                            className="flex items-center gap-2 bg-zinc-900/60 border border-white/10 rounded-2xl px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-300 hover:border-rose-500/30 transition-all backdrop-blur-md"
                        >
                            <Target className="w-3.5 h-3.5 text-rose-400" />
                            {game || 'All Games'}
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${gameMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {gameMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                    className="absolute right-0 mt-2 w-56 bg-zinc-900/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md z-50"
                                >
                                    <button
                                        onClick={() => { setGame(''); setGameMenuOpen(false); }}
                                        className={`w-full text-left px-4 py-3 text-sm font-semibold transition-all ${!game
                                            ? 'bg-rose-600/20 text-rose-300'
                                            : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                            }`}
                                    >
                                        All Games
                                    </button>
                                    {(filterOptions?.games ?? []).map(g => (
                                        <button
                                            key={g}
                                            onClick={() => { setGame(g); setGameMenuOpen(false); }}
                                            className={`w-full text-left px-4 py-3 text-sm font-semibold transition-all ${game === g
                                                ? 'bg-rose-600/20 text-rose-300'
                                                : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                                }`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Country Filter Dropdown — matching game dropdown style */}
                    <div className="relative">
                        <button
                            onClick={() => { setCountryMenuOpen(!countryMenuOpen); setGameMenuOpen(false); }}
                            className="flex items-center gap-2 bg-zinc-900/60 border border-white/10 rounded-2xl px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-300 hover:border-rose-500/30 transition-all backdrop-blur-md"
                        >
                            <Globe className="w-3.5 h-3.5 text-rose-400" />
                            {country || 'All Countries'}
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${countryMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {countryMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                    className="absolute right-0 mt-2 w-56 bg-zinc-900/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md z-50 max-h-72 overflow-y-auto"
                                >
                                    <button
                                        onClick={() => { setCountry(''); setCountryMenuOpen(false); }}
                                        className={`w-full text-left px-4 py-3 text-sm font-semibold transition-all ${!country
                                            ? 'bg-rose-600/20 text-rose-300'
                                            : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                            }`}
                                    >
                                        All Countries
                                    </button>
                                    {(filterOptions?.countries ?? []).map(c => (
                                        <button
                                            key={c}
                                            onClick={() => { setCountry(c); setCountryMenuOpen(false); }}
                                            className={`w-full text-left px-4 py-3 text-sm font-semibold transition-all flex items-center gap-2 ${country === c
                                                ? 'bg-rose-600/20 text-rose-300'
                                                : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                                }`}
                                        >
                                            <img
                                                src={getCountryFlagUrl(c)}
                                                alt={c}
                                                className="w-5 h-3.5 object-cover rounded-sm"
                                            />
                                            {c}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Leaderboard Table */}
            <div className="max-w-5xl mx-auto px-4">
                {loading ? (
                    <div className="flex items-center justify-center py-32">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            className="w-10 h-10 border-2 border-rose-500/30 border-t-rose-500 rounded-full"
                        />
                    </div>
                ) : data.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-32"
                    >
                        <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-zinc-800">
                            <Trophy className="w-10 h-10 text-zinc-700" />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">No Rankings Yet</h3>
                        <p className="text-zinc-500 text-sm">Complete matches to see rankings here.</p>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-3"
                    >
                        {/* Header Row */}
                        <div className="grid grid-cols-[60px,1fr,repeat(4,minmax(60px,100px)),100px] gap-2 px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                            <span>Rank</span>
                            <span>Team</span>
                            <span className="text-center">Played</span>
                            <span className="text-center">Wins</span>
                            <span className="text-center">Win%</span>
                            <span className="text-center">Trophies</span>
                            <span className="text-right">RP</span>
                        </div>

                        {/* Rows */}
                        <AnimatePresence mode="popLayout">
                            {data.map((entry, idx) => {
                                const isTopThree = idx < 3;
                                const RankIcon = isTopThree ? RANK_ICONS[idx] : null;

                                return (
                                    <motion.div
                                        key={entry.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ delay: idx * 0.03, type: 'spring', stiffness: 120 }}
                                        className={`group relative grid grid-cols-[60px,1fr,repeat(4,minmax(60px,100px)),100px] gap-2 items-center px-6 py-4 rounded-2xl border transition-all duration-300 backdrop-blur-sm ${isTopThree
                                            ? 'bg-zinc-900/60 border-rose-500/20 hover:border-rose-500/40 shadow-lg'
                                            : 'bg-zinc-950/40 border-white/5 hover:border-white/15 hover:bg-zinc-900/40'
                                            }`}
                                    >
                                        {/* Rank Badge */}
                                        <div className="flex items-center justify-center">
                                            {isTopThree ? (
                                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${RANK_COLORS[idx]} flex items-center justify-center shadow-lg`}>
                                                    {RankIcon && <RankIcon className="w-4 h-4 text-white" />}
                                                </div>
                                            ) : (
                                                <span className="text-sm font-black text-zinc-600 tabular-nums">{idx + 1}</span>
                                            )}
                                        </div>

                                        {/* Name + Avatar */}
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-11 h-11 flex-shrink-0 flex items-center justify-center">
                                                <EntityAvatar
                                                    src={(entry as any).logo_url}
                                                    name={(entry as any).name}
                                                    entityId={entry.id}
                                                    type="team"
                                                    size="w-11 h-11"
                                                />
                                            </div>
                                            <span className="text-sm font-bold text-white truncate group-hover:text-rose-300 transition-colors">
                                                {(entry as any).name}
                                            </span>
                                            {entry.country_code && (
                                                <img
                                                    src={getCountryFlagUrl(entry.country_code)}
                                                    alt={entry.country_code}
                                                    className="w-5 h-3.5 object-cover rounded-sm shadow-sm border border-white/5"
                                                    title={entry.country_code}
                                                />
                                            )}
                                        </div>

                                        {/* Stats */}
                                        <span className="text-center text-sm font-bold text-zinc-400 tabular-nums">{entry.matches_played}</span>
                                        <span className="text-center text-sm font-bold text-emerald-400 tabular-nums">{entry.wins}</span>
                                        <span className="text-center text-sm font-bold text-zinc-300 tabular-nums">{entry.win_rate}%</span>
                                        <span className="text-center text-sm font-bold text-yellow-400 tabular-nums flex items-center justify-center gap-1">
                                            {(entry as TeamStats).tournaments_won}
                                            <Trophy className="w-3 h-3 text-yellow-500/60" />
                                        </span>

                                        {/* RP */}
                                        <div className="text-right">
                                            <span className={`text-base font-black tabular-nums ${isTopThree ? 'text-rose-400' : 'text-white'}`}>
                                                {entry.rp.toLocaleString()}
                                            </span>
                                            <span className="text-[9px] font-bold text-zinc-600 ml-1 uppercase">rp</span>
                                        </div>

                                        {/* Hover Glow */}
                                        {isTopThree && (
                                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-500/5 blur-[60px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                        )}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>

            {/* RP System Explanation */}
            <div className="max-w-5xl mx-auto px-4 mt-16">
                <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-8 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-rose-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-tight">Ranking Points (RP)</h3>
                            <p className="text-xs text-zinc-500">
                                {game && isBattleRoyale(game)
                                    ? 'Battle Royale scoring — placement + kills per game'
                                    : 'How rankings are calculated'}
                            </p>
                        </div>
                    </div>
                    {game && isBattleRoyale(game) ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                                { label: 'Placement Pts', value: 'Per Game', icon: Target, color: 'text-emerald-400' },
                                { label: 'Kill Pts', value: 'Per Kill', icon: Swords, color: 'text-rose-400' },
                                { label: 'Tournament Win', value: `+${RP_PER_TOURNAMENT_WIN}`, icon: Trophy, color: 'text-yellow-400' },
                                { label: 'Points Total', value: 'All Games', icon: Flame, color: 'text-amber-400' },
                            ].map(item => (
                                <div key={item.label} className="bg-zinc-950/60 rounded-2xl p-4 border border-white/5">
                                    <item.icon className={`w-5 h-5 ${item.color} mb-2`} />
                                    <p className="text-xs text-zinc-500 font-semibold mb-1">{item.label}</p>
                                    <p className={`text-lg font-black ${item.color}`}>{item.value}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                                { label: 'Match Win', value: `+${RP_PER_WIN}`, icon: Swords, color: 'text-emerald-400' },
                                { label: 'Match Loss', value: `${RP_PER_LOSS}`, icon: Target, color: 'text-rose-400' },
                                { label: 'Tournament Win', value: `+${RP_PER_TOURNAMENT_WIN}`, icon: Trophy, color: 'text-yellow-400' },
                                { label: 'Match MVP', value: `+${RP_PER_MVP}`, icon: Star, color: 'text-rose-400' },
                            ].map(item => (
                                <div key={item.label} className="bg-zinc-950/60 rounded-2xl p-4 border border-white/5">
                                    <item.icon className={`w-5 h-5 ${item.color} mb-2`} />
                                    <p className="text-xs text-zinc-500 font-semibold mb-1">{item.label}</p>
                                    <p className={`text-lg font-black ${item.color}`}>{item.value} <span className="text-[10px] text-zinc-600">RP</span></p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Leaderboards;
