import React from 'react';
import { Trophy, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePrizeDistribution } from '@/hooks/usePrizeDistribution';
import { useTournamentPlacements, useResolvePlacements } from '@/hooks/useTournamentPlacements';
import { useTournamentPayouts, useUpdatePayout, useRewardDistributions, useUpdateRewardDistribution } from '@/hooks/useTournamentPayouts';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatCurrency';
import type { CashPayout, RewardDistribution } from '@/types/prizeDistribution';
import type { Tournament } from '@/types/tournament';

interface PrizeDistributionTabProps {
    tournament: Tournament;
}

const PAYOUT_STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
    requested: { label: 'Requested', icon: Clock, className: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
    approved:  { label: 'Approved',  icon: CheckCircle2, className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    paid:      { label: 'Paid',      icon: CheckCircle2, className: 'bg-green-500/20 text-green-300 border-green-500/30' },
    rejected:  { label: 'Rejected',  icon: XCircle, className: 'bg-red-500/20 text-red-300 border-red-500/30' },
    failed:    { label: 'Failed',    icon: XCircle, className: 'bg-red-500/20 text-red-300 border-red-500/30' },
};

const REWARD_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    pending:     { label: 'Pending',     className: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
    distributed: { label: 'Distributed', className: 'bg-green-500/20 text-green-300 border-green-500/30' },
    claimed:     { label: 'Claimed',     className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    cancelled:   { label: 'Cancelled',   className: 'bg-red-500/20 text-red-300 border-red-500/30' },
};

function PayoutStatusBadge({ status }: { status: string }) {
    const cfg = PAYOUT_STATUS_CONFIG[status] ?? PAYOUT_STATUS_CONFIG.requested;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
            <Icon className="w-3 h-3" />
            {cfg.label}
        </span>
    );
}

const NEXT_PAYOUT_STATUS: Record<string, string[]> = {
    requested: ['approved', 'rejected'],
    approved:  ['paid', 'rejected'],
    paid:      [],
    rejected:  ['requested'],
    failed:    ['requested'],
};

export const PrizeDistributionTab: React.FC<PrizeDistributionTabProps> = ({ tournament }) => {
    const { toast } = useToast();
    const tournamentId = tournament.id;

    const { data: config, isLoading: configLoading } = usePrizeDistribution(tournamentId);
    const { data: placements, isLoading: placementsLoading } = useTournamentPlacements(tournamentId);
    const { data: payoutsData, isLoading: payoutsLoading } = useTournamentPayouts(tournamentId);
    const { data: rewardDists } = useRewardDistributions(tournamentId);

    const resolvePlacements = useResolvePlacements();
    const updatePayout = useUpdatePayout();
    const updateReward = useUpdateRewardDistribution();

    const prizePool = parseFloat(tournament.prize_pool ?? '0') || 0;
    const currency = (tournament as any).currency ?? 'USD';
    const hasPrizePool = prizePool > 0;
    const isGateway = payoutsData?.payment_method === 'gateway';

    const handleResolve = async () => {
        try {
            await resolvePlacements.mutateAsync({ tournamentId, force: true });
            toast({ title: 'Placements Updated', description: 'Tournament placements have been recalculated.' });
        } catch {
            toast({ title: 'Error', description: 'Could not resolve placements.', variant: 'destructive' });
        }
    };

    const handlePayoutStatus = async (payout: CashPayout, status: string) => {
        try {
            await updatePayout.mutateAsync({
                tournamentId,
                payoutId: payout.id,
                status,
                failedReason: undefined,
            });
            toast({ title: 'Payout Updated', description: `Status changed to ${status}.` });
        } catch {
            toast({ title: 'Error', description: 'Could not update payout.', variant: 'destructive' });
        }
    };

    const handleRewardStatus = async (dist: RewardDistribution, status: string) => {
        try {
            await updateReward.mutateAsync({ tournamentId, distributionId: dist.id, status });
            toast({ title: 'Reward Updated', description: `Status changed to ${status}.` });
        } catch {
            toast({ title: 'Error', description: 'Could not update reward.', variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-8 py-4">
            {/* ── Section A: Prize Distribution Config ───────────────────── */}
            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-lg font-semibold text-white">Prize Distribution</h3>
                </div>

                {configLoading ? (
                    <div className="text-sm text-gray-500">Loading...</div>
                ) : config && config.placements.length > 0 ? (
                    <div className="rounded-none border border-white/10 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-white/[0.03]">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Placement</th>
                                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">%</th>
                                    {hasPrizePool && <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Per Team</th>}
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Rewards</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {config.placements.map((p) => (
                                    <tr key={p.position}>
                                        <td className="px-4 py-3 text-white">{p.label}</td>
                                        <td className="px-4 py-3 text-right text-gray-300">{p.percentage}%</td>
                                        {hasPrizePool && (
                                            <td className="px-4 py-3 text-right text-gray-300">
                                                {formatCurrency((p.percentage / 100) * prizePool / p.shared_count, currency)}
                                            </td>
                                        )}
                                        <td className="px-4 py-3">
                                            {p.rewards && p.rewards.length > 0
                                                ? p.rewards.map((r, i) => <span key={i} className="mr-1 text-xs text-gray-400">{r.title}</span>)
                                                : <span className="text-xs text-gray-600">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {config.disclaimer && (
                            <div className="border-t border-white/5 px-4 py-3 bg-white/[0.01]">
                                <p className="text-xs text-gray-500">{config.disclaimer}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="rounded-none border border-dashed border-white/10 py-8 text-center">
                        <Trophy className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No prize distribution configured</p>
                        <p className="text-xs text-gray-600 mt-1">Edit the tournament to configure prize distribution from the wizard.</p>
                    </div>
                )}
            </section>

            {/* ── Section B: Placements ────────────────────────────────────── */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Placements</h3>
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
                </div>

                {placementsLoading ? (
                    <div className="text-sm text-gray-500">Loading placements...</div>
                ) : (placements?.length ?? 0) === 0 ? (
                    <div className="rounded-none border border-dashed border-white/10 py-8 text-center">
                        <p className="text-sm text-gray-500">No placements resolved yet</p>
                        <p className="text-xs text-gray-600 mt-1">Use the Update button above to calculate placements from current bracket data.</p>
                    </div>
                ) : (
                    <div className="rounded-none border border-white/10 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-white/[0.03]">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Rank</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Team</th>
                                    {hasPrizePool && <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Prize</th>}
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Rewards</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {placements!.map((p) => (
                                    <tr key={p.team_id}>
                                        <td className="px-4 py-3 text-white font-mono">{p.placement_label}</td>
                                        <td className="px-4 py-3 text-white">{p.team_name}</td>
                                        {hasPrizePool && (
                                            <td className="px-4 py-3 text-right text-gray-300">
                                                {p.prize_amount > 0 ? formatCurrency(p.prize_amount, p.currency) : '—'}
                                            </td>
                                        )}
                                        <td className="px-4 py-3">
                                            {p.rewards.length > 0
                                                ? p.rewards.map((r, i) => <span key={i} className="mr-1 text-xs text-gray-400">{r.title}</span>)
                                                : <span className="text-xs text-gray-600">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* ── Section C: Payouts (cash) ───────────────────────────────── */}
            {hasPrizePool && (
                <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Cash Payouts</h3>

                    {!payoutsLoading && !isGateway && payoutsData?.manual_payout_notes && (
                        <div className="rounded-none border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-gray-300">
                            <span className="font-medium text-white">Payment Instructions: </span>
                            {payoutsData.manual_payout_notes}
                        </div>
                    )}
                    {!payoutsLoading && isGateway && (
                        <div className="rounded-none border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-gray-400">
                            Payouts for this tournament are managed by Esportra. Funds collected via payment gateway are in platform custody and will be disbursed after verification.
                        </div>
                    )}

                    {payoutsLoading ? (
                        <div className="text-sm text-gray-500">Loading payouts...</div>
                    ) : (payoutsData?.payouts.length ?? 0) === 0 ? (
                        <div className="rounded-none border border-dashed border-white/10 py-6 text-center">
                            <p className="text-sm text-gray-500">No payout rows yet — resolve placements first</p>
                        </div>
                    ) : (
                        <div className="rounded-none border border-white/10 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-white/[0.03]">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Team</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Placement</th>
                                        <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Amount</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                        {!isGateway && <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {payoutsData!.payouts.map((payout) => {
                                        const nextStatuses = NEXT_PAYOUT_STATUS[payout.status] ?? [];
                                        return (
                                            <tr key={payout.id}>
                                                <td className="px-4 py-3 text-white">{payout.team_name}</td>
                                                <td className="px-4 py-3 text-gray-400">{payout.placement_label ?? `#${payout.placement}`}</td>
                                                <td className="px-4 py-3 text-right font-mono text-white">
                                                    {formatCurrency(payout.amount, payout.currency)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <PayoutStatusBadge status={payout.status} />
                                                </td>
                                                {!isGateway && (
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            {nextStatuses.map(s => (
                                                                <button
                                                                    key={s}
                                                                    type="button"
                                                                    disabled={updatePayout.isPending}
                                                                    onClick={() => handlePayoutStatus(payout, s)}
                                                                    className="text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 rounded px-2 py-1 transition-colors disabled:opacity-50"
                                                                >
                                                                    Mark {s}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {/* ── Section D: Reward Distributions (non-cash) ───────────────── */}
            {(rewardDists?.length ?? 0) > 0 && (
                <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Non-Cash Rewards</h3>
                    <div className="rounded-none border border-white/10 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-white/[0.03]">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Team</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Reward</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {rewardDists!.map((dist) => {
                                    const cfg = REWARD_STATUS_CONFIG[dist.status] ?? REWARD_STATUS_CONFIG.pending;
                                    return (
                                        <tr key={dist.id}>
                                            <td className="px-4 py-3 text-white">{dist.team_name}</td>
                                            <td className="px-4 py-3 text-gray-300">{dist.reward_title}</td>
                                            <td className="px-4 py-3 text-gray-500 capitalize">{dist.reward_type.replace('_', ' ')}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
                                                    {cfg.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {dist.status !== 'distributed' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRewardStatus(dist, 'distributed')}
                                                            className="text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 rounded px-2 py-1 transition-colors"
                                                        >
                                                            Mark Distributed
                                                        </button>
                                                    )}
                                                    {dist.status !== 'cancelled' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRewardStatus(dist, 'cancelled')}
                                                            className="text-xs text-gray-600 hover:text-red-400 border border-white/5 hover:border-red-500/30 rounded px-2 py-1 transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
};

export default PrizeDistributionTab;
