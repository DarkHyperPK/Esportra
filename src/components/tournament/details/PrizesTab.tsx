import React from 'react';
import { Trophy, Info, AlertTriangle } from 'lucide-react';
import { usePrizeDistribution } from '@/hooks/usePrizeDistribution';

interface PrizesTabProps {
    tournamentId: string;
    prizePool?: string | number | null;
    currency?: string;
    payoutMethod?: 'manual' | 'gateway' | null;
}

function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

const PrizesTab: React.FC<PrizesTabProps> = ({ tournamentId, prizePool, currency = 'USD', payoutMethod }) => {
    const { data: config, isLoading } = usePrizeDistribution(tournamentId);
    const pool = parseFloat(String(prizePool ?? '0')) || 0;

    if (isLoading) {
        return <div className="py-12 text-center text-gray-500 text-sm">Loading prize information...</div>;
    }

    if (!config || !config.placements?.length) {
        return (
            <div className="py-12 text-center">
                <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Prize distribution has not been configured yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 py-4">
            {pool > 0 && (
                <div className="text-center py-6 border-b border-white/5">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Total Prize Pool</div>
                    <div className="text-4xl font-bold text-white">{formatCurrency(pool, currency)}</div>
                </div>
            )}

            {payoutMethod === 'gateway' && (
                <div className="flex items-start gap-3 rounded-none border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-300/80">Displayed prize amounts are before platform fees. Actual payouts may be slightly lower.</p>
                </div>
            )}

            <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Distribution</h3>
                <div className="rounded-none border border-white/10 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-white/[0.03]">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Placement</th>
                                <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">%</th>
                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Rewards</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {config.placements.map((p) => (
                                <tr key={p.position}>
                                    <td className="px-4 py-3 font-medium text-white">{p.label}</td>
                                    <td className="px-4 py-3 text-right text-gray-300">{p.percentage}%</td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {(p.rewards ?? []).length > 0
                                                ? p.rewards!.map((r, i) => (
                                                    <span key={i} className="text-xs bg-white/5 text-gray-300 border border-white/10 rounded px-2 py-0.5">{r.title}</span>
                                                ))
                                                : <span className="text-xs text-gray-600">—</span>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {config.disclaimer && (
                <div className="flex items-start gap-3 rounded-none border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-400">{config.disclaimer}</p>
                </div>
            )}
        </div>
    );
};

export default PrizesTab;
