import { useState } from 'react';
import { Gift, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CONTROL_CLASS } from '@/components/ui/kit';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatCurrency';
import type { PrizeDistributionEntry, PrizeReward } from '@/types/prizeDistribution';

const REWARD_TYPES = [
    { value: 'physical_product', label: 'Physical product' },
    { value: 'digital_product', label: 'Digital product' },
    { value: 'in_game_currency', label: 'In-game currency' },
    { value: 'service', label: 'Service' },
    { value: 'trophy', label: 'Trophy or medal' },
    { value: 'other', label: 'Other' },
];

interface PrizeBandsEditorProps {
    placements: PrizeDistributionEntry[];
    prizePool: number;
    currency: string;
    onChange: (next: PrizeDistributionEntry[]) => void;
}

const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

/** One row per place: its name, its share, the cash it works out to, and optional non-cash rewards. */
export function PrizeBandsEditor({ placements, prizePool, currency, onChange }: PrizeBandsEditorProps) {
    const [openRewards, setOpenRewards] = useState<Record<number, boolean>>({});

    const updateBand = (idx: number, patch: Partial<PrizeDistributionEntry>) =>
        onChange(placements.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
    const updateRewards = (idx: number, rewards: PrizeReward[]) => updateBand(idx, { rewards });
    const addBand = () => {
        const next = placements.length > 0 ? placements[placements.length - 1].position + 1 : 1;
        onChange([...placements, { position: next, label: `${ordinal(next)} place`, percentage: 0, shared_count: 1, rewards: [] }]);
    };
    const removeBand = (idx: number) => onChange(placements.filter((_, i) => i !== idx).map((p, i) => ({ ...p, position: i + 1 })));

    return (
        <div className="space-y-2">
            {placements.map((band, idx) => {
                const rewards = band.rewards ?? [];
                const showRewards = openRewards[idx] || rewards.length > 0;
                return (
                    <div key={idx} className="bg-white/[0.02] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]">
                        <div className="flex items-center gap-3 p-3">
                            <span className="w-7 shrink-0 text-center font-mono text-xs text-zinc-500">{ordinal(band.position)}</span>
                            <Input
                                aria-label={`Name for ${ordinal(band.position)} place`}
                                value={band.label}
                                onChange={(e) => updateBand(idx, { label: e.target.value })}
                                placeholder="e.g. Champion"
                                className={cn(CONTROL_CLASS, 'h-9 flex-1 text-sm')}
                            />
                            <div className="flex items-center gap-1">
                                <Input
                                    aria-label={`Share for ${ordinal(band.position)} place, percent`}
                                    type="number" min={0} max={100} value={band.percentage}
                                    onChange={(e) => updateBand(idx, { percentage: parseFloat(e.target.value) || 0 })}
                                    className={cn(CONTROL_CLASS, 'h-9 w-20 text-right text-sm')}
                                />
                                <span className="text-xs text-zinc-500">%</span>
                            </div>
                            <span className="hidden w-24 text-right text-xs tabular-nums text-zinc-400 sm:block">
                                {prizePool > 0 ? formatCurrency((band.percentage / 100) * prizePool, currency) : '—'}
                            </span>
                            <button
                                type="button"
                                onClick={() => setOpenRewards((prev) => ({ ...prev, [idx]: !showRewards }))}
                                className={cn('p-1 transition-colors hover:text-white', showRewards ? 'text-rose-300' : 'text-zinc-500')}
                                aria-label={`Non-cash rewards for ${ordinal(band.position)} place`}
                                aria-expanded={showRewards}
                            >
                                <Gift className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => removeBand(idx)} className="p-1 text-zinc-600 transition-colors hover:text-red-300" aria-label={`Remove ${ordinal(band.position)} place`}>
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>

                        {showRewards && (
                            <div className="space-y-2 border-t border-white/[0.06] bg-black/20 p-3">
                                {rewards.map((reward, ri) => (
                                    <div key={ri} className="flex items-center gap-2">
                                        <select
                                            aria-label="Reward type"
                                            value={reward.type}
                                            onChange={(e) => updateRewards(idx, rewards.map((r, i) => (i === ri ? { ...r, type: e.target.value } : r)))}
                                            className="h-9 border border-white/10 bg-black/40 px-2 text-xs text-white focus:border-rose-400/60 focus:outline-none"
                                        >
                                            {REWARD_TYPES.map((rt) => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                                        </select>
                                        <Input
                                            aria-label="Reward"
                                            value={reward.title}
                                            onChange={(e) => updateRewards(idx, rewards.map((r, i) => (i === ri ? { ...r, title: e.target.value } : r)))}
                                            placeholder="e.g. Gaming headset"
                                            className={cn(CONTROL_CLASS, 'h-9 flex-1 text-xs')}
                                        />
                                        <button type="button" onClick={() => updateRewards(idx, rewards.filter((_, i) => i !== ri))} className="p-1 text-zinc-600 hover:text-red-300" aria-label="Remove reward">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => updateRewards(idx, [...rewards, { type: 'other', title: '', quantity: 1 } as PrizeReward])}
                                    className="flex items-center gap-1 text-xs font-medium text-rose-300 hover:text-rose-200"
                                >
                                    <Plus className="h-3 w-3" aria-hidden /> Add a trophy, product or in-game item
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
            <button
                type="button"
                onClick={addBand}
                className="flex w-full items-center justify-center gap-2 border border-dashed border-white/10 px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:border-white/25 hover:text-white"
            >
                <Plus className="h-4 w-4" aria-hidden /> Add a place
            </button>
        </div>
    );
}
