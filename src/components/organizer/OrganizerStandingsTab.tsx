import React from 'react';
import { RefreshCw, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTournamentPlacements, useResolvePlacements } from '@/hooks/useTournamentPlacements';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatCurrency';
import type { ResolvedPlacement } from '@/types/prizeDistribution';
import type { Tournament } from '@/types/tournament';

interface OrganizerStandingsTabProps {
    tournament: Pick<Tournament, 'id' | 'prize_pool'>;
    locked?: boolean;
}

function groupByPlacement(placements: ResolvedPlacement[]) {
    const groups: { placement: number | null; label: string; teams: ResolvedPlacement[] }[] = [];
    for (const p of placements) {
        const existing = groups.find(g => g.placement === p.placement);
        if (existing) existing.teams.push(p);
        else groups.push({ placement: p.placement, label: p.placement_label, teams: [p] });
    }
    return groups;
}

export const OrganizerStandingsTab: React.FC<OrganizerStandingsTabProps> = ({ tournament, locked }) => {
    const { toast } = useToast();
    const tournamentId = tournament.id;
    const prizePool = parseFloat(tournament.prize_pool ?? '0') || 0;
    const currency = (tournament as any).currency ?? 'USD';
    const hasPrizePool = prizePool > 0;

    const { data: placements, isLoading } = useTournamentPlacements(tournamentId);
    const resolvePlacements = useResolvePlacements();

    const handleResolve = async () => {
        try {
            await resolvePlacements.mutateAsync({ tournamentId, force: true });
            toast({ title: 'Standings Updated', description: 'Placements recalculated from current bracket data.' });
        } catch {
            toast({ title: 'Error', description: 'Could not recalculate standings.', variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Standings</h3>
                {locked ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                        <Lock className="w-3.5 h-3.5" />
                        Results locked
                    </span>
                ) : (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleResolve}
                        disabled={resolvePlacements.isPending}
                        className="text-xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${resolvePlacements.isPending ? 'animate-spin' : ''}`} />
                        Update
                    </Button>
                )}
            </div>

            {isLoading ? (
                <div className="text-sm text-gray-500">Loading standings...</div>
            ) : (placements?.length ?? 0) === 0 ? (
                <div className="rounded-none border border-dashed border-white/10 py-8 text-center">
                    <p className="text-sm text-gray-500">No standings available yet</p>
                    <p className="text-xs text-gray-600 mt-1">Use the Update button to calculate standings from current bracket data.</p>
                </div>
            ) : (() => {
                const active = placements!.filter(p => p.placement === null);
                const settled = placements!.filter(p => p.placement !== null);
                const isComplete = active.length === 0;
                const showPrize = hasPrizePool && isComplete;
                const activeRanked: Array<typeof active[0] & { rank: number }> = [];
                for (let i = 0; i < active.length; i++) {
                    const p = active[i];
                    const prev = activeRanked[i - 1];
                    const tied = prev !== undefined
                        && prev.wins === p.wins
                        && prev.losses === p.losses
                        && prev.score_diff === p.score_diff;
                    activeRanked.push({ ...p, rank: tied ? prev.rank : i + 1 });
                }
                return (
                    <div className="rounded-none border border-white/10 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-white/[0.03]">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase w-20">Rank</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Team</th>
                                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-500 uppercase w-10">P</th>
                                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-500 uppercase w-14">W–L</th>
                                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-500 uppercase w-12">+/−</th>
                                    {showPrize && <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Prize</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {/* Still-competing teams with provisional rank numbers */}
                                {activeRanked.map(p => (
                                    <tr key={p.team_id} className="border-t border-white/5">
                                        <td className="px-4 py-3 align-middle border-r border-white/5">
                                            <span className="font-mono font-bold text-sm text-white">{p.rank}</span>
                                        </td>
                                        <td className="px-4 py-3 text-white">{p.team_name}</td>
                                        <td className="px-3 py-3 text-center text-gray-400 font-mono">{p.played}</td>
                                        <td className="px-3 py-3 text-center font-mono">
                                            <span className="text-green-400">{p.wins}</span>
                                            <span className="text-gray-600 mx-0.5">–</span>
                                            <span className="text-red-400">{p.losses}</span>
                                            {p.ties > 0 && <span className="text-gray-500 ml-0.5">({p.ties})</span>}
                                        </td>
                                        <td className="px-3 py-3 text-center font-mono">
                                            <span className={p.score_diff > 0 ? 'text-green-400' : p.score_diff < 0 ? 'text-red-400' : 'text-gray-500'}>
                                                {p.score_diff > 0 ? `+${p.score_diff}` : p.score_diff}
                                            </span>
                                        </td>
                                    </tr>
                                ))}

                                {/* Confirmed placements — numeric rank only */}
                                {groupByPlacement(settled).map((group) =>
                                    group.teams.map((p, teamIdx) => (
                                        <tr key={p.team_id} className={`border-t ${teamIdx === 0 && active.length > 0 ? 'border-white/20' : 'border-white/5'}`}>
                                            {teamIdx === 0 && (
                                                <td
                                                    className="px-4 py-3 align-middle border-r border-white/5"
                                                    rowSpan={group.teams.length}
                                                >
                                                    <span className="font-mono text-xs text-gray-600">{p.placement}</span>
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-gray-400">{p.team_name}</td>
                                            <td className="px-3 py-3 text-center text-gray-400 font-mono">{p.played}</td>
                                            <td className="px-3 py-3 text-center font-mono">
                                                <span className="text-green-400">{p.wins}</span>
                                                <span className="text-gray-600 mx-0.5">–</span>
                                                <span className="text-red-400">{p.losses}</span>
                                                {p.ties > 0 && <span className="text-gray-500 ml-0.5">({p.ties})</span>}
                                            </td>
                                            <td className="px-3 py-3 text-center font-mono">
                                                <span className={p.score_diff > 0 ? 'text-green-400' : p.score_diff < 0 ? 'text-red-400' : 'text-gray-500'}>
                                                    {p.score_diff > 0 ? `+${p.score_diff}` : p.score_diff}
                                                </span>
                                            </td>
                                            {showPrize && (
                                                <td className="px-4 py-3 text-right text-gray-300">
                                                    {p.prize_amount > 0 ? formatCurrency(p.prize_amount, currency) : '—'}
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                );
            })()}
        </div>
    );
};
