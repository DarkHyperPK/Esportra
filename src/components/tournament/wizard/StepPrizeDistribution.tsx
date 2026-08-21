import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Plus, Trash2, ChevronDown, ChevronUp, Info, DollarSign, CreditCard } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { WizardStepProps } from '@/types/tournamentWizard';
import type { PrizeDistributionEntry, PrizeReward } from '@/types/prizeDistribution';
import { cn } from '@/lib/utils';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'PKR', 'INR', 'TRY', 'EGP', 'QAR', 'MYR', 'SGD', 'BRL', 'JPY'];

const REWARD_TYPES = [
    { value: 'physical_product', label: 'Physical Product' },
    { value: 'in_game_currency', label: 'In-Game Currency' },
    { value: 'digital_product', label: 'Digital Product' },
    { value: 'trophy', label: 'Trophy / Medal' },
    { value: 'other', label: 'Other' },
];

const DEFAULT_TEMPLATES: Array<{ name: string; placements: Array<{ label: string; percentage: number; shared_count: number }> }> = [
    { name: 'Top 3 (60/30/10)', placements: [{ label: '1st Place', percentage: 60, shared_count: 1 }, { label: '2nd Place', percentage: 30, shared_count: 1 }, { label: '3rd Place', percentage: 10, shared_count: 1 }] },
    { name: 'Top 4 (50/25/15/10)', placements: [{ label: '1st Place', percentage: 50, shared_count: 1 }, { label: '2nd Place', percentage: 25, shared_count: 1 }, { label: '3rd Place', percentage: 15, shared_count: 1 }, { label: '4th Place', percentage: 10, shared_count: 1 }] },
    { name: 'Winner Takes All', placements: [{ label: '1st Place', percentage: 100, shared_count: 1 }] },
];

function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

function calcBandAmount(percentage: number, prizePool: number) {
    return (percentage / 100) * prizePool;
}

const StepPrizeDistribution: React.FC<WizardStepProps> = ({ data, updateData, errors }) => {
    const config = data.prizeDistribution;
    const prizePool = parseFloat(data.prizePool) || 0;
    const currency = data.currency || 'USD';
    const [expandedRewards, setExpandedRewards] = useState<Record<number, boolean>>({});

    const placements: PrizeDistributionEntry[] = config?.placements ?? [];
    const totalPct = placements.reduce((sum, p) => sum + p.percentage, 0);
    const hasOrganizerRewards = placements.some(p => p.rewards && p.rewards.length > 0);

    const setPlacements = (next: PrizeDistributionEntry[]) => {
        updateData({
            prizeDistribution: {
                mode: 'percentage',
                placements: next,
                disclaimer: config?.disclaimer,
            },
        });
    };

    const applyTemplate = (tmpl: typeof DEFAULT_TEMPLATES[0]) => {
        const entries: PrizeDistributionEntry[] = tmpl.placements.map((p, i) => ({
            position: i + 1,
            label: p.label,
            percentage: p.percentage,
            shared_count: p.shared_count,
            rewards: [],
        }));
        updateData({ prizeDistribution: { mode: 'percentage', placements: entries } });
    };

    const addBand = () => {
        const nextPos = placements.length > 0 ? placements[placements.length - 1].position + 1 : 1;
        setPlacements([...placements, { position: nextPos, label: `${nextPos}th Place`, percentage: 0, shared_count: 1, rewards: [] }]);
    };

    const removeBand = (idx: number) => {
        const next = placements.filter((_, i) => i !== idx).map((p, i) => ({ ...p, position: i + 1 }));
        setPlacements(next);
    };

    const updateBand = (idx: number, field: keyof PrizeDistributionEntry, value: unknown) => {
        setPlacements(placements.map((p, i) => i === idx ? { ...p, [field]: value } : p));
    };

    const addReward = (bandIdx: number) => {
        const rewards = [...(placements[bandIdx].rewards ?? []), { type: 'other', title: '', quantity: 1 } as PrizeReward];
        updateBand(bandIdx, 'rewards', rewards);
    };

    const updateReward = (bandIdx: number, rewardIdx: number, field: keyof PrizeReward, value: unknown) => {
        const rewards = (placements[bandIdx].rewards ?? []).map((r, i) => i === rewardIdx ? { ...r, [field]: value } : r);
        updateBand(bandIdx, 'rewards', rewards);
    };

    const removeReward = (bandIdx: number, rewardIdx: number) => {
        const rewards = (placements[bandIdx].rewards ?? []).filter((_, i) => i !== rewardIdx);
        updateBand(bandIdx, 'rewards', rewards);
    };

    const isPaidEntry = data.entryFee && data.entryFee.toLowerCase() !== 'free' && data.entryFee !== '0';

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="space-y-1">
                <h2 className="text-2xl font-bold text-white">Prize Pool & Distribution</h2>
                <p className="text-gray-400">Set the prize pool, entry fee, and how winnings are split.</p>
            </div>

            {/* Prize Pool & Fees */}
            <div className="w-full h-px bg-white/5 my-6" />

            {/* Currency */}
            <div className="space-y-2 mb-6">
                <Label htmlFor="currency" className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                    <DollarSign className="w-4 h-4" />
                    Currency
                </Label>
                <select
                    id="currency"
                    value={data.currency || 'USD'}
                    onChange={(e) => updateData({ currency: e.target.value })}
                    className="w-full md:w-48 h-10 rounded-md border border-white/10 bg-black/40 text-white px-3 text-sm focus:outline-none focus:border-indigo-500"
                >
                    {CURRENCIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <Label htmlFor="prizePool" className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <DollarSign className="w-4 h-4" />
                        Prize Pool ({currency}) *
                    </Label>
                    <Input
                        id="prizePool"
                        placeholder="e.g., 50000"
                        value={data.prizePool}
                        onChange={(e) => updateData({ prizePool: e.target.value })}
                        className={cn("font-bold tracking-tight", errors.prizePool && 'border-red-500')}
                    />
                    {errors.prizePool && <p className="text-sm text-red-500">{errors.prizePool}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="entryFee" className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <DollarSign className="w-4 h-4" />
                        Entry Fee ({currency}) *
                    </Label>
                    <Input
                        id="entryFee"
                        placeholder="Enter amount or 'Free'"
                        value={data.entryFee}
                        onChange={(e) => updateData({ entryFee: e.target.value })}
                        className={cn("font-bold tracking-tight", errors.entryFee && 'border-red-500')}
                    />
                    {errors.entryFee && <p className="text-sm text-red-500">{errors.entryFee}</p>}
                    <p className="text-xs text-gray-500">Type "Free" for no entry fee</p>
                </div>
            </div>

            {isPaidEntry && (
                <div className="space-y-2 mt-2">
                    <Label htmlFor="paymentInstructions" className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <DollarSign className="w-4 h-4" />
                        Entry Fee Payment Instructions
                    </Label>
                    <textarea
                        id="paymentInstructions"
                        rows={4}
                        placeholder="How should participants pay the entry fee? E.g.:&#10;Bank: ABC Bank, Account# 1234567890&#10;JazzCash/EasyPaisa: 0300-1234567&#10;After payment, upload receipt screenshot during registration."
                        value={data.paymentInstructions || ''}
                        onChange={(e) => updateData({ paymentInstructions: e.target.value })}
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                    />
                    <p className="text-xs text-gray-500">Players will see these instructions when registering and be asked to upload a payment receipt</p>
                </div>
            )}

            {/* Payout Method */}
            <div className="w-full h-px bg-white/5 my-6" />
            <div className="space-y-4">
                <Label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                    <CreditCard className="w-4 h-4" />
                    Prize Payout Method
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => updateData({ payoutMethod: 'manual' })}
                        className={cn(
                            'flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors',
                            data.payoutMethod === 'manual' || !data.payoutMethod
                                ? 'border-indigo-500/60 bg-indigo-500/10 text-white'
                                : 'border-white/10 bg-black/20 text-gray-400 hover:border-white/20'
                        )}
                    >
                        <span className="text-sm font-semibold">Manual Payment</span>
                        <span className="text-xs opacity-70">You handle payouts outside the platform</span>
                    </button>
                    <div className="flex flex-col items-start gap-1 rounded-lg border border-white/10 bg-black/20 p-4 opacity-50 cursor-not-allowed">
                        <span className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                            Gateway
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded px-1.5 py-0.5">Coming soon</span>
                        </span>
                        <span className="text-xs text-gray-500">Automated payouts via payment gateway</span>
                    </div>
                </div>

                <p className="text-xs text-gray-500">Payment gateway integration is coming soon. Until then, all prize payouts are processed manually by the organizer.</p>

                <div className="space-y-2">
                    <Label htmlFor="manualPayoutNotes" className="text-xs text-gray-400">
                        Payout Instructions (optional)
                    </Label>
                    <textarea
                        id="manualPayoutNotes"
                        rows={3}
                        placeholder="Describe how winners will receive their prizes. E.g.: Bank transfer within 7 days of tournament completion. Contact us via Discord to provide bank details."
                        value={data.manualPayoutNotes || ''}
                        onChange={(e) => updateData({ manualPayoutNotes: e.target.value })}
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    />
                    <p className="text-xs text-gray-500">Shown to winning teams after the tournament</p>
                </div>
            </div>

            {/* Prize Distribution */}
            <div className="w-full h-px bg-white/5 my-6" />
            <div className="space-y-1 mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Prize Distribution</h3>
                <p className="text-xs text-gray-500">Configure how the prize pool is split across placements. This is optional — you can set it up after creating the tournament.</p>
            </div>

            {prizePool > 0 && (
                <div className="flex items-center gap-3 rounded-none border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
                    <Trophy className="w-5 h-5 text-yellow-400 shrink-0" />
                    <span className="text-sm text-yellow-300">Prize pool: <span className="font-bold">{formatCurrency(prizePool, currency)}</span></span>
                </div>
            )}

            {/* Template picker */}
            {placements.length === 0 && (
                <div className="space-y-3">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Quick Templates</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {DEFAULT_TEMPLATES.map(tmpl => (
                            <button
                                key={tmpl.name}
                                type="button"
                                onClick={() => applyTemplate(tmpl)}
                                className="rounded-none border border-white/10 bg-white/[0.02] p-4 text-left hover:border-white/20 hover:bg-white/[0.04] transition-colors"
                            >
                                <div className="text-sm font-medium text-white">{tmpl.name}</div>
                                <div className="text-xs text-gray-500 mt-1">{tmpl.placements.length} placement{tmpl.placements.length !== 1 ? 's' : ''}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Placement bands */}
            {placements.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Placement Bands</Label>
                        <span className={cn('text-xs font-mono', totalPct > 100 ? 'text-red-400' : totalPct === 100 ? 'text-green-400' : 'text-gray-400')}>
                            {totalPct.toFixed(1)}% allocated
                            {prizePool > 0 && ` · ${formatCurrency(prizePool - calcBandAmount(totalPct, prizePool), currency)} remaining`}
                        </span>
                    </div>

                    {totalPct > 100 && (
                        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                            <Info className="w-3.5 h-3.5 shrink-0" />
                            Total exceeds 100% — adjust the percentages below.
                        </div>
                    )}

                    <div className="space-y-2">
                        {placements.map((band, idx) => (
                            <div key={idx} className="rounded-none border border-white/10 bg-white/[0.02]">
                                <div className="flex items-center gap-3 px-4 py-3">
                                    <span className="text-xs text-gray-500 w-6 text-center font-mono">{band.position}</span>
                                    <Input
                                        value={band.label}
                                        onChange={e => updateBand(idx, 'label', e.target.value)}
                                        placeholder="e.g. 1st Place"
                                        className="flex-1 h-8 text-sm"
                                    />
                                    <div className="flex items-center gap-1">
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={band.percentage}
                                            onChange={e => updateBand(idx, 'percentage', parseFloat(e.target.value) || 0)}
                                            className="w-20 h-8 text-sm text-right [color-scheme:dark]"
                                        />
                                        <span className="text-xs text-gray-500">%</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setExpandedRewards(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                        className="text-gray-500 hover:text-gray-300 transition-colors"
                                        title="Add non-cash rewards"
                                    >
                                        {expandedRewards[idx] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeBand(idx)}
                                        className="text-gray-600 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                {expandedRewards[idx] && (
                                    <div className="border-t border-white/5 px-4 py-3 space-y-2 bg-black/20">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-500 uppercase tracking-widest">Non-Cash Rewards</span>
                                            <button
                                                type="button"
                                                onClick={() => addReward(idx)}
                                                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                                            >
                                                <Plus className="w-3 h-3" /> Add Reward
                                            </button>
                                        </div>
                                        {(band.rewards ?? []).map((reward, ri) => (
                                            <div key={ri} className="flex items-center gap-2">
                                                <select
                                                    value={reward.type}
                                                    onChange={e => updateReward(idx, ri, 'type', e.target.value)}
                                                    className="h-8 rounded border border-white/10 bg-black/40 text-white px-2 text-xs focus:outline-none focus:border-indigo-500"
                                                >
                                                    {REWARD_TYPES.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                                                </select>
                                                <Input
                                                    value={reward.title}
                                                    onChange={e => updateReward(idx, ri, 'title', e.target.value)}
                                                    placeholder="Reward title"
                                                    className="flex-1 h-8 text-xs"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeReward(idx, ri)}
                                                    className="text-gray-600 hover:text-red-400"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                        {(band.rewards ?? []).length === 0 && (
                                            <p className="text-xs text-gray-600">No non-cash rewards added. Use this for trophies, peripherals, in-game items, etc.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={addBand}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-dashed border-white/10 hover:border-white/20 rounded-none px-4 py-2 w-full transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Add Placement Band
                    </button>
                </div>
            )}

            {placements.length === 0 && (
                <button
                    type="button"
                    onClick={addBand}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-dashed border-white/10 hover:border-white/20 rounded-none px-4 py-2 w-full transition-colors"
                >
                    <Plus className="w-4 h-4" /> Add Placement Band Manually
                </button>
            )}

            {hasOrganizerRewards && (
                <div className="rounded-none border border-blue-500/20 bg-blue-500/5 p-4 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-widest">
                        <Info className="w-3.5 h-3.5" />
                        Platform Disclaimer Preview
                    </div>
                    <p className="text-xs text-gray-400">Non-cash rewards (trophies, products, etc.) are fulfilled by the tournament organizer. Esportra is not responsible for their delivery.</p>
                </div>
            )}

            {placements.length > 0 && (
                <button
                    type="button"
                    onClick={() => updateData({ prizeDistribution: null })}
                    className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                >
                    Clear distribution
                </button>
            )}

            <p className="text-xs text-gray-600">You can also configure or update prize distribution from the "Prizes" tab after creating the tournament.</p>
        </motion.div>
    );
};

export default StepPrizeDistribution;
