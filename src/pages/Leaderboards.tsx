import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Trophy, Medal, Crown, Award, TrendingUp, Swords, Target,
    Globe2, AlertTriangle, RotateCcw, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { SEO } from '@/components/SEO';
import EntityAvatar from '@/components/ui/EntityAvatar';
import { getCountryFlagUrl } from '@/utils/countries';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    LEADERBOARD_PAGE_SIZE, useLeaderboardFilters, useLeaderboardMeta, useTeamLeaderboard,
} from '@/hooks/useTeamLeaderboard';
import type { LeaderboardTeamRow } from '@/types/leaderboard';

const RANK_COLORS = [
    'from-yellow-400 to-amber-500',   // 1st
    'from-zinc-300 to-zinc-400',      // 2nd
    'from-amber-600 to-amber-700',    // 3rd
];

const RANK_ICONS = [Crown, Medal, Award];

const prettyRegion = (value: string) =>
    value.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const prettyGame = (value: string) =>
    value.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
    const isTopThree = rank <= 3;
    if (!isTopThree) {
        return <span className="text-sm font-black text-zinc-600 tabular-nums">{rank}</span>;
    }
    const Icon = RANK_ICONS[rank - 1];
    return (
        <div className={`w-9 h-9 bg-gradient-to-br ${RANK_COLORS[rank - 1]} flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-white" />
        </div>
    );
};

const LeaderboardSkeletonRows: React.FC = () => (
    <>
        {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
                <TableCell><Skeleton className="h-8 w-8 mx-auto bg-white/5" /></TableCell>
                <TableCell>
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-full bg-white/5" />
                        <Skeleton className="h-4 w-36 bg-white/5" />
                    </div>
                </TableCell>
                <TableCell colSpan={7}><Skeleton className="h-4 w-full max-w-xs ml-auto bg-white/5" /></TableCell>
            </TableRow>
        ))}
    </>
);

const Leaderboards: React.FC = () => {
    // ── URL-param state (shareable, back-button friendly) ──
    const [searchParams, setSearchParams] = useSearchParams();

    const game = searchParams.get('game') ?? '';
    const country = searchParams.get('country') ?? '';
    const region = searchParams.get('region') ?? '';
    const page = Math.max(1, Number(searchParams.get('page')) || 1);

    const updateParam = (key: string, value: string) => {
        setSearchParams(
            prev => {
                const next = new URLSearchParams(prev);
                if (value) next.set(key, value);
                else next.delete(key);
                if (key !== 'page') next.delete('page');
                return next;
            },
            { replace: true },
        );
    };

    const clearFilters = () => {
        setSearchParams(prev => {
            const sp = new URLSearchParams(prev);
            sp.delete('region');
            sp.delete('country');
            sp.delete('page');
            return sp;
        }, { replace: true });
    };

    const hasActiveFilters = Boolean(region || country);

    // ── Data ──
    const filtersQuery = useLeaderboardFilters();
    const metaQuery = useLeaderboardMeta();

    // Game is the required axis — default to the first game with data so the
    // board is immediately useful, while keeping the choice in the URL.
    React.useEffect(() => {
        const games = filtersQuery.data?.games ?? [];
        if (!game && games.length > 0) {
            updateParam('game', [...games].sort()[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtersQuery.data?.games, game]);

    const offset = (page - 1) * LEADERBOARD_PAGE_SIZE;
    const boardQuery = useTeamLeaderboard({
        game,
        region: region || undefined,
        country: country || undefined,
        limit: LEADERBOARD_PAGE_SIZE,
        offset,
    });

    const rows: LeaderboardTeamRow[] = boardQuery.data?.items ?? [];
    const total = boardQuery.data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / LEADERBOARD_PAGE_SIZE));
    const isLoading = boardQuery.isLoading || filtersQuery.isLoading;

    const gameOptions = useMemo(
        () => [...(filtersQuery.data?.games ?? [])].sort(),
        [filtersQuery.data?.games],
    );

    const meta = metaQuery.data;

    return (
        <div className="min-h-screen pb-20">
            <SEO
                title="Leaderboards"
                description="Global team rankings across every esports title on Esportra — filter by game, region, or country."
                url="/leaderboards"
            />

            {/* Hero Header */}
            <div className="relative overflow-hidden pt-10 pb-12 px-4">
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
                            Leader<span className="text-rose-500">boards</span>
                        </h1>
                        <p className="text-zinc-500 text-sm sm:text-base max-w-md mx-auto">
                            Team rankings across every title — earned through match wins, tournament placements, and championships.
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Controls */}
            <div className="max-w-5xl mx-auto px-4 mb-6">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    {/* Game — required base axis */}
                    <div className="flex items-center border border-white/10 bg-[#0a0a0c]/90 p-1 self-start">
                        <div className="flex items-center gap-2 px-5 py-2 text-xs font-black uppercase tracking-widest bg-rose-500 text-white">
                            <Globe2 className="w-3.5 h-3.5" />
                            {game ? prettyGame(game) : 'Pick a game'}
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Select
                            value={game}
                            onValueChange={v => updateParam('game', v === '__all' ? '' : v)}
                        >
                            <SelectTrigger className="w-[170px] bg-[#0a0a0c]/90 border-white/10 focus:border-rose-500/50 text-xs font-bold uppercase tracking-wider">
                                <SelectValue placeholder="All Games" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#121214] border-zinc-800 text-white max-h-[300px]">
                                <SelectItem value="__all" className="focus:bg-zinc-800 cursor-pointer">All Games</SelectItem>
                                {gameOptions.map(g => (
                                    <SelectItem key={g} value={g} className="focus:bg-zinc-800 focus:text-rose-500 cursor-pointer">
                                        {prettyGame(g)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={region}
                            onValueChange={v => updateParam('region', v === '__all' ? '' : v)}
                        >
                            <SelectTrigger className="w-[180px] bg-[#0a0a0c]/90 border-white/10 focus:border-rose-500/50 text-xs font-bold uppercase tracking-wider">
                                <SelectValue placeholder={region ? undefined : 'All Regions'}>{region ? prettyRegion(region) : 'All Regions'}</SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-[#121214] border-zinc-800 text-white max-h-[300px]">
                                <SelectItem value="__all" className="focus:bg-zinc-800 cursor-pointer">All Regions</SelectItem>
                                {(filtersQuery.data?.regions ?? []).map(r => (
                                    <SelectItem key={r} value={r} className="focus:bg-zinc-800 focus:text-rose-500 cursor-pointer">
                                        {prettyRegion(r)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <CountryFilterSelect
                            value={country}
                            options={filtersQuery.data?.countries ?? []}
                            onChange={v => updateParam('country', v === '__all' ? '' : v)}
                        />

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="text-zinc-500 hover:text-white hover:bg-white/5 text-xs font-bold uppercase tracking-wider"
                            >
                                <X className="w-3.5 h-3.5 mr-1" /> Clear
                            </Button>
                        )}
                    </div>
                </div>

                {/* Result count */}
                {!boardQuery.isLoading && !boardQuery.isError && total > 0 && (
                    <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-zinc-600">
                        {total.toLocaleString()} ranked team{total === 1 ? '' : 's'}
                        {game && <> in <span className="text-rose-400">{prettyGame(game)}</span></>}
                        {region && <> · region <span className="text-rose-400">{prettyRegion(region)}</span></>}
                        {country && <> · country <span className="text-rose-400">{country}</span></>}
                    </p>
                )}
            </div>

            {/* Leaderboard */}
            <div className="max-w-5xl mx-auto px-4">
                {boardQuery.isError ? (
                    <div className="text-center py-32">
                        <div className="w-20 h-20 bg-[#0a0a0c] flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
                            <AlertTriangle className="w-10 h-10 text-rose-400/60" />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Couldn't Load Rankings</h3>
                        <p className="text-zinc-500 text-sm mb-6">Something went wrong while fetching the leaderboard.</p>
                        <Button
                            onClick={() => boardQuery.refetch()}
                            variant="outline"
                            className="border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" /> Try Again
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto -mx-4 px-4">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[70px] text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Rank</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Team</TableHead>
                                    <TableHead className="w-[80px] text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 hidden sm:table-cell">Played</TableHead>
                                    <TableHead className="w-[70px] text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">W</TableHead>
                                    <TableHead className="w-[70px] text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 hidden md:table-cell">L</TableHead>
                                    <TableHead className="w-[80px] text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Win%</TableHead>
                                    <TableHead className="w-[80px] text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Titles</TableHead>
                                    <TableHead className="w-[90px] text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 hidden lg:table-cell">Best</TableHead>
                                    <TableHead className="w-[110px] text-right text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">RP</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <LeaderboardSkeletonRows />
                                ) : rows.length === 0 ? (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={9} className="py-24 text-center">
                                            <Trophy className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                                            <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1">No Rankings Yet</h3>
                                            <p className="text-zinc-500 text-sm">
                                                {hasActiveFilters
                                                    ? 'No teams match these filters yet — try widening your search.'
                                                    : 'Complete matches to see rankings here.'}
                                            </p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map(entry => {
                                        const isTopThree = entry.rank <= 3;
                                        return (
                                            <TableRow
                                                key={entry.team_id}
                                                className={isTopThree ? 'border-rose-500/20 bg-rose-500/[0.03]' : ''}
                                            >
                                                <TableCell className="text-center">
                                                    <RankBadge rank={entry.rank} />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <EntityAvatar
                                                            src={entry.logo_url}
                                                            name={entry.name}
                                                            entityId={entry.team_id}
                                                            type="team"
                                                            size="w-10 h-10"
                                                        />
                                                        <span className={`text-sm font-bold truncate ${isTopThree ? 'text-rose-100' : 'text-white'}`}>
                                                            {entry.name}
                                                        </span>
                                                        {entry.country_code && (
                                                            <img
                                                                src={getCountryFlagUrl(entry.country_code)}
                                                                alt={entry.country_code}
                                                                className="w-5 h-3.5 object-cover rounded-sm shadow-sm border border-white/5 flex-shrink-0"
                                                                title={entry.country_code}
                                                            />
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center text-sm font-bold text-zinc-400 tabular-nums hidden sm:table-cell">{entry.matches_played}</TableCell>
                                                <TableCell className="text-center text-sm font-bold text-emerald-400 tabular-nums">{entry.wins}</TableCell>
                                                <TableCell className="text-center text-sm font-bold text-zinc-500 tabular-nums hidden md:table-cell">{entry.losses}</TableCell>
                                                <TableCell className="text-center text-sm font-bold text-zinc-300 tabular-nums">{entry.win_rate}%</TableCell>
                                                <TableCell className="text-center text-sm font-bold text-yellow-400 tabular-nums">{entry.tournaments_won}</TableCell>
                                                <TableCell className="text-center text-sm font-bold text-cyan-400 tabular-nums hidden lg:table-cell">
                                                    {entry.best_placement ? `#${entry.best_placement}` : '—'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className={`text-base font-black tabular-nums ${isTopThree ? 'text-rose-400' : 'text-white'}`}>
                                                        {entry.rp.toLocaleString()}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-zinc-600 ml-1 uppercase">rp</span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* Pagination */}
                {!boardQuery.isError && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-8">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1 || boardQuery.isFetching}
                            onClick={() => updateParam('page', String(page - 1))}
                            className="border-white/10 text-zinc-300 hover:bg-white/5 disabled:opacity-30"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                        </Button>
                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 tabular-nums">
                            Page {page} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages || boardQuery.isFetching}
                            onClick={() => updateParam('page', String(page + 1))}
                            className="border-white/10 text-zinc-300 hover:bg-white/5 disabled:opacity-30"
                        >
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                )}
            </div>

            {/* RP System Explanation — values live from /api/leaderboards/meta */}
            <div className="max-w-5xl mx-auto px-4 mt-16">
                <div className="bg-[#0a0a0c]/90 border border-white/10 p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-rose-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-tight">Ranking Points (RP)</h3>
                            <p className="text-xs text-zinc-500">How team rankings are calculated</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'Match Win', value: `+${meta?.win_points ?? 50}`, icon: Swords, color: 'text-emerald-400' },
                            { label: 'Match Loss', value: `-${meta?.loss_points ?? 10}`, icon: Target, color: 'text-rose-400' },
                            { label: 'Championship', value: `+${meta?.tournament_win_points ?? 500}`, icon: Trophy, color: 'text-yellow-400' },
                            {
                                label: 'Runner-Up Finishes',
                                value: meta?.placement_points
                                    ? `+#2 ${meta.placement_points.find(tier => tier.placement === 2)?.points ?? 300}`
                                    : '—',
                                icon: Medal,
                                color: 'text-cyan-400',
                            },
                        ].map(item => (
                            <div key={item.label} className="bg-[#0a0a0c]/90 p-4 border border-white/5">
                                <item.icon className={`w-5 h-5 ${item.color} mb-2`} />
                                <p className="text-xs text-zinc-500 font-semibold mb-1">{item.label}</p>
                                <p className={`text-lg font-black ${item.color}`}>{item.value} <span className="text-[10px] text-zinc-600">RP</span></p>
                            </div>
                        ))}
                    </div>
                    {meta && (
                        <p className="mt-6 text-xs text-zinc-600 leading-relaxed">
                            Placement rewards:{' '}
                            {meta.placement_points.map(tier => (
                                <span key={`${tier.placement ?? tier.from_placement}`} className="mr-3">
                                    {tier.placement
                                        ? <><span className="text-zinc-400">#{tier.placement}</span> +{tier.points}</>
                                        : <><span className="text-zinc-400">#{tier.from_placement}–{tier.to_placement}</span> +{tier.points}</>}
                                </span>
                            ))}
                            <br />A championship always nets at least +{meta.tournament_win_points} RP from that tournament.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

const CountryFilterSelect: React.FC<{
    value: string;
    options: string[];
    onChange: (value: string) => void;
}> = ({ value, options, onChange }) => (
    <Select value={value || '__all'} onValueChange={onChange}>
        <SelectTrigger className="w-[180px] bg-[#0a0a0c]/90 border-white/10 focus:border-rose-500/50 text-xs font-bold uppercase tracking-wider">
            <SelectValue placeholder="All Countries">
                {value ? (
                    <span className="flex items-center gap-2">
                        <img src={getCountryFlagUrl(value)} alt={value} className="w-5 h-3.5 object-cover rounded-sm" />
                        {value}
                    </span>
                ) : (
                    'All Countries'
                )}
            </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-[#121214] border-zinc-800 text-white max-h-[300px]">
            <SelectItem value="__all" className="focus:bg-zinc-800 cursor-pointer">All Countries</SelectItem>
            {options.map(c => (
                <SelectItem key={c} value={c} className="focus:bg-zinc-800 focus:text-rose-500 cursor-pointer">
                    <span className="flex items-center gap-2">
                        <img src={getCountryFlagUrl(c)} alt={c} className="w-5 h-3.5 object-cover rounded-sm" />
                        {c}
                    </span>
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
);

export default Leaderboards;
