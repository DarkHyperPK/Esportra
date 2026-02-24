import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Star, Swords, Crown, ChevronDown, Users, User, Flame, Target, Award, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { getCountryFlag, getCountryFlagUrl } from '@/utils/countries';
import CountrySelector from '@/components/ui/CountrySelector';
import { Globe } from 'lucide-react';
import EntityAvatar from '@/components/ui/EntityAvatar';

// ── Types ──
interface TeamStats {
    id: string;
    name: string;
    logo_url: string | null;
    matches_played: number;
    wins: number;
    losses: number;
    win_rate: number;
    tournaments_won: number;
    rp: number;
}

interface PlayerStats {
    id: string;
    username: string;
    avatar_url: string | null;
    matches_played: number;
    wins: number;
    losses: number;
    win_rate: number;
    mvps: number;
    rp: number;
}

// ── Constants ──
const GAMES = ['All Games', 'Valorant', 'CS2', 'League of Legends'];
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
    const [category, setCategory] = useState<'teams' | 'players'>('teams');
    const [game, setGame] = useState('All Games');
    const [gameMenuOpen, setGameMenuOpen] = useState(false);
    const [teams, setTeams] = useState<TeamStats[]>([]);
    const [players, setPlayers] = useState<PlayerStats[]>([]);
    const [country, setCountry] = useState('All Countries');
    const [loading, setLoading] = useState(true);

    // ── Fetch Team Leaderboard ──
    useEffect(() => {
        if (category !== 'teams') return;
        setLoading(true);

        const fetchTeams = async () => {
            try {
                // Get all teams
                const { data: allTeams, error: teamErr } = await supabase
                    .from('teams')
                    .select('id, name, logo_url, game, country_code');

                if (teamErr || !allTeams) { setLoading(false); return; }

                // Filter by game if needed
                const filteredTeams = allTeams.filter(t => {
                    const matchesGame = game === 'All Games' || (t as any).game?.toLowerCase() === game.toLowerCase();
                    const matchesCountry = country === 'All Countries' || t.country_code === country;
                    return matchesGame && matchesCountry;
                });

                // Get all completed matches
                const teamIds = filteredTeams.map(t => t.id);
                if (teamIds.length === 0) { setTeams([]); setLoading(false); return; }

                const { data: matches } = await supabase
                    .from('brkt_matches')
                    .select('team1_id, team2_id, winner_id, status')
                    .eq('status', 'completed');

                // Get tournament wins
                const { data: tournamentWins } = await supabase
                    .from('tournaments')
                    .select('winner_id')
                    .not('winner_id', 'is', null);

                const stats: TeamStats[] = filteredTeams.map(team => {
                    const teamMatches = (matches || []).filter(m => m.team1_id === team.id || m.team2_id === team.id);
                    const wins = teamMatches.filter(m => m.winner_id === team.id).length;
                    const losses = teamMatches.length - wins;
                    const tWins = (tournamentWins || []).filter(t => t.winner_id === team.id).length;
                    const rp = Math.max(0, (wins * RP_PER_WIN) + (losses * RP_PER_LOSS) + (tWins * RP_PER_TOURNAMENT_WIN));

                    return {
                        id: team.id,
                        name: team.name,
                        logo_url: team.logo_url,
                        matches_played: teamMatches.length,
                        wins,
                        losses,
                        win_rate: teamMatches.length > 0 ? Math.round((wins / teamMatches.length) * 100) : 0,
                        tournaments_won: tWins,
                        rp,
                        country_code: team.country_code,
                    };
                });

                stats.sort((a, b) => b.rp - a.rp);
                setTeams(stats);
            } catch (err) {
                console.error('Leaderboard fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchTeams();
    }, [category, game, country]);

    // ── Fetch Player Leaderboard ──
    useEffect(() => {
        if (category !== 'players') return;
        setLoading(true);

        const fetchPlayers = async () => {
            try {
                // Get users who are team members
                const { data: members } = await supabase
                    .from('team_members')
                    .select('user_id, team_id');

                if (!members || members.length === 0) { setPlayers([]); setLoading(false); return; }

                const userIds = [...new Set(members.map(m => m.user_id))];

                // Get profiles
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url, country_code')
                    .in('id', userIds);

                if (!profiles) { setLoading(false); return; }

                // Filter by country if needed
                const filteredProfiles = country === 'All Countries'
                    ? profiles
                    : profiles.filter(p => p.country_code === country);

                if (filteredProfiles.length === 0) { setPlayers([]); setLoading(false); return; }

                // Get team IDs per user
                const userTeams: Record<string, string[]> = {};
                members.forEach(m => {
                    if (!userTeams[m.user_id]) userTeams[m.user_id] = [];
                    userTeams[m.user_id].push(m.team_id);
                });

                // Get all completed matches
                const { data: matches } = await supabase
                    .from('brkt_matches')
                    .select('team1_id, team2_id, winner_id, status')
                    .eq('status', 'completed');

                // Get MVPs
                const { data: mvpGames } = await supabase
                    .from('brkt_match_games')
                    .select('mvp_id')
                    .not('mvp_id', 'is', null);

                const stats: PlayerStats[] = filteredProfiles.map(profile => {
                    const myTeamIds = userTeams[profile.id] || [];
                    const playerMatches = (matches || []).filter(m =>
                        myTeamIds.includes(m.team1_id) || myTeamIds.includes(m.team2_id)
                    );
                    const wins = playerMatches.filter(m => myTeamIds.includes(m.winner_id)).length;
                    const losses = playerMatches.length - wins;
                    const mvps = (mvpGames || []).filter(g => g.mvp_id === profile.id).length;
                    const rp = Math.max(0, (wins * RP_PER_WIN) + (losses * RP_PER_LOSS) + (mvps * RP_PER_MVP));

                    return {
                        id: profile.id,
                        username: profile.username || 'Unknown',
                        avatar_url: profile.avatar_url,
                        matches_played: playerMatches.length,
                        wins,
                        losses,
                        win_rate: playerMatches.length > 0 ? Math.round((wins / playerMatches.length) * 100) : 0,
                        mvps,
                        rp,
                        country_code: profile.country_code,
                    };
                });

                stats.sort((a, b) => b.rp - a.rp);
                setPlayers(stats.filter(p => p.matches_played > 0));
            } catch (err) {
                console.error('Player leaderboard fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPlayers();
    }, [category, game, country]);

    const data = category === 'teams' ? teams : players;

    return (
        <div className="min-h-screen pb-20">
            {/* Hero Header */}
            <div className="relative overflow-hidden pt-10 pb-16 px-4">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />
                <div className="relative z-10 max-w-5xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-6">
                            <Trophy className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">Rankings</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-none mb-4">
                            Leader<span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">boards</span>
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
                    {/* Category Toggle */}
                    <div className="flex items-center bg-zinc-900/60 border border-white/10 rounded-2xl p-1 backdrop-blur-md">
                        <button
                            onClick={() => setCategory('teams')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${category === 'teams'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'text-zinc-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            Teams
                        </button>
                        <button
                            onClick={() => setCategory('players')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${category === 'players'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'text-zinc-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <User className="w-3.5 h-3.5" />
                            Players
                        </button>
                    </div>

                    {/* Game Filter Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setGameMenuOpen(!gameMenuOpen)}
                            className="flex items-center gap-2 bg-zinc-900/60 border border-white/10 rounded-2xl px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-300 hover:border-indigo-500/30 transition-all backdrop-blur-md"
                        >
                            <Target className="w-3.5 h-3.5 text-indigo-400" />
                            {game}
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
                                    {GAMES.map(g => (
                                        <button
                                            key={g}
                                            onClick={() => { setGame(g); setGameMenuOpen(false); }}
                                            className={`w-full text-left px-4 py-3 text-sm font-semibold transition-all ${game === g
                                                ? 'bg-indigo-600/20 text-indigo-300'
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

                    {/* Country Filter */}
                    <div className="flex items-center gap-2">
                        <CountrySelector
                            value={country === 'All Countries' ? '' : country}
                            onChange={(val) => setCountry(val || 'All Countries')}
                            placeholder="All Countries"
                            className="w-48 !bg-zinc-900/60 !border-white/10 !rounded-2xl !px-5 !py-2.5 !text-xs !font-bold !uppercase !tracking-widest !h-[unset]"
                        />
                        {country !== 'All Countries' && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCountry('All Countries')}
                                className="text-zinc-500 hover:text-white"
                            >
                                Clear
                            </Button>
                        )}
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
                            className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full"
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
                            <span>{category === 'teams' ? 'Team' : 'Player'}</span>
                            <span className="text-center">Played</span>
                            <span className="text-center">Wins</span>
                            <span className="text-center">Win%</span>
                            <span className="text-center">{category === 'teams' ? 'Trophies' : 'MVPs'}</span>
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
                                            ? 'bg-zinc-900/60 border-indigo-500/20 hover:border-indigo-500/40 shadow-lg'
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
                                                    src={(entry as any).logo_url || (entry as any).avatar_url}
                                                    name={(entry as any).name || (entry as any).username}
                                                    entityId={entry.id}
                                                    type={category === 'teams' ? 'team' : 'user'}
                                                    size="w-11 h-11"
                                                />
                                            </div>
                                            <span className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                                                {(entry as any).name || (entry as any).username}
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
                                            {category === 'teams' ? (entry as TeamStats).tournaments_won : (entry as PlayerStats).mvps}
                                            {category === 'teams'
                                                ? <Trophy className="w-3 h-3 text-yellow-500/60" />
                                                : <Star className="w-3 h-3 text-yellow-500/60" />
                                            }
                                        </span>

                                        {/* RP */}
                                        <div className="text-right">
                                            <span className={`text-base font-black tabular-nums ${isTopThree ? 'text-indigo-400' : 'text-white'}`}>
                                                {entry.rp.toLocaleString()}
                                            </span>
                                            <span className="text-[9px] font-bold text-zinc-600 ml-1 uppercase">rp</span>
                                        </div>

                                        {/* Hover Glow */}
                                        {isTopThree && (
                                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 blur-[60px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
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
                        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-tight">Ranking Points (RP)</h3>
                            <p className="text-xs text-zinc-500">How rankings are calculated</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'Match Win', value: `+${RP_PER_WIN}`, icon: Swords, color: 'text-emerald-400' },
                            { label: 'Match Loss', value: `${RP_PER_LOSS}`, icon: Target, color: 'text-rose-400' },
                            { label: 'Tournament Win', value: `+${RP_PER_TOURNAMENT_WIN}`, icon: Trophy, color: 'text-yellow-400' },
                            { label: 'Match MVP', value: `+${RP_PER_MVP}`, icon: Star, color: 'text-indigo-400' },
                        ].map(item => (
                            <div key={item.label} className="bg-zinc-950/60 rounded-2xl p-4 border border-white/5">
                                <item.icon className={`w-5 h-5 ${item.color} mb-2`} />
                                <p className="text-xs text-zinc-500 font-semibold mb-1">{item.label}</p>
                                <p className={`text-lg font-black ${item.color}`}>{item.value} <span className="text-[10px] text-zinc-600">RP</span></p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Leaderboards;
