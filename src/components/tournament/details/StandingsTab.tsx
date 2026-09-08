import React from 'react';
import { Trophy } from 'lucide-react';
import { useTournamentPlacements } from '@/hooks/useTournamentPlacements';
import { formatCurrency } from '@/utils/formatCurrency';
import type { ResolvedPlacement } from '@/types/prizeDistribution';

interface StandingsTabProps {
    tournamentId: string;
    currency?: string;
}

function groupByPlacement(placements: ResolvedPlacement[]) {
    const groups: { placement: number | null; label: string; teams: ResolvedPlacement[] }[] = [];
    for (const p of placements) {
        const existing = groups.find(g => g.placement === p.placement);
        if (existing) {
            existing.teams.push(p);
        } else {
            groups.push({ placement: p.placement, label: p.placement_label, teams: [p] });
        }
    }
    return groups;
}

const PODIUM_CONFIG = [
    { rank: 2, height: 'h-16', color: 'text-gray-300', bg: 'bg-gray-500/10 border-gray-500/20' },
    { rank: 1, height: 'h-24', color: 'text-yellow-300', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    { rank: 3, height: 'h-12', color: 'text-amber-600', bg: 'bg-amber-600/10 border-amber-600/20' },
];

const StandingsTab: React.FC<StandingsTabProps> = ({ tournamentId, currency = 'USD' }) => {
    const { data: placements, isLoading } = useTournamentPlacements(tournamentId);

    if (isLoading) {
        return <div className="py-12 text-center text-gray-500 text-sm">Loading standings...</div>;
    }

    if (!placements || !Array.isArray(placements) || placements.length === 0) {
        return (
            <div className="py-12 text-center">
                <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Final standings will appear here once the tournament is complete.</p>
            </div>
        );
    }

    const top3 = PODIUM_CONFIG.map(cfg => ({
        ...cfg,
        placement: placements.find(p => p.placement === cfg.rank),
    })).filter(c => c.placement);

    return (
        <div className="space-y-8 py-4">
            {/* Podium */}
            {top3.length >= 2 && (
                <div className="flex items-end justify-center gap-4 pt-4">
                    {top3.map(({ rank, height, color, bg, placement }) => (
                        placement && (
                            <div key={rank} className={`flex flex-col items-center gap-2 rounded-none border ${bg} px-6 ${height} justify-end pb-3 min-w-[100px]`}>
                                <div className={`text-sm font-bold ${color}`}>{placement.placement_label}</div>
                                <div className="text-white text-sm font-medium text-center leading-tight">{placement.team_name}</div>
                                {placement.prize_amount > 0 && (
                                    <div className={`text-xs font-mono ${color}`}>{formatCurrency(placement.prize_amount, placement.currency || currency)}</div>
                                )}
                            </div>
                        )
                    ))}
                </div>
            )}

            {/* Full Rankings Table */}
            <div className="rounded-none border border-white/10 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-white/[0.03]">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase w-20">Rank</th>
                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Team</th>
                            <th className="px-3 py-2 text-center text-xs font-bold text-gray-500 uppercase w-10">P</th>
                            <th className="px-3 py-2 text-center text-xs font-bold text-gray-500 uppercase w-14">W–L</th>
                            <th className="px-3 py-2 text-center text-xs font-bold text-gray-500 uppercase w-12">+/−</th>
                            <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Prize</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupByPlacement(placements).map((group) =>
                            group.teams.map((p, teamIdx) => (
                                <tr key={p.team_id} className={`border-t border-white/5 ${p.placement !== null && p.placement <= 3 ? 'bg-white/[0.01]' : ''}`}>
                                    {teamIdx === 0 && (
                                        <td
                                            className="px-4 py-3 align-middle border-r border-white/5"
                                            rowSpan={group.teams.length}
                                        >
                                            <span className={`font-mono font-bold text-sm ${p.placement === 1 ? 'text-yellow-400' : p.placement === 2 ? 'text-gray-300' : p.placement === 3 ? 'text-amber-600' : 'text-gray-500'}`}>
                                                {group.label}
                                            </span>
                                        </td>
                                    )}
                                    <td className="px-4 py-3 text-white font-medium">{p.team_name}</td>
                                    <td className="px-3 py-3 text-center text-gray-400 font-mono text-sm">{p.played}</td>
                                    <td className="px-3 py-3 text-center font-mono text-sm">
                                        <span className="text-green-400">{p.wins}</span>
                                        <span className="text-gray-600 mx-0.5">–</span>
                                        <span className="text-red-400">{p.losses}</span>
                                        {p.ties > 0 && <span className="text-gray-500 ml-0.5">({p.ties})</span>}
                                    </td>
                                    <td className="px-3 py-3 text-center font-mono text-sm">
                                        <span className={p.score_diff > 0 ? 'text-green-400' : p.score_diff < 0 ? 'text-red-400' : 'text-gray-500'}>
                                            {p.score_diff > 0 ? `+${p.score_diff}` : p.score_diff}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-300 font-mono">
                                        {p.prize_amount > 0 ? formatCurrency(p.prize_amount, p.currency || currency) : '—'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StandingsTab;
