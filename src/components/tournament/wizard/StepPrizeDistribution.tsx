import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChoiceCard, ChoiceGroup, CONTROL_CLASS, CONTROL_ERROR_CLASS, Field, FormSection, InlineNotice } from '@/components/ui/kit';
import { WizardStepProps } from '@/types/tournamentWizard';
import type { PrizeDistributionEntry } from '@/types/prizeDistribution';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatCurrency';
import { PrizeAllocationBar } from './PrizeAllocationBar';
import { PrizeBandsEditor } from './PrizeBandsEditor';
import { WizardStepFrame } from './WizardStepFrame';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'PKR', 'INR', 'TRY', 'EGP', 'QAR', 'MYR', 'SGD', 'BRL', 'JPY'];
const LOCKED = 'Locked once the tournament exists, because players signed up under these terms.';

const SPLITS: Array<{ name: string; hint: string; shares: number[] }> = [
    { name: 'Top 3', hint: '60 / 30 / 10', shares: [60, 30, 10] },
    { name: 'Top 4', hint: '50 / 25 / 15 / 10', shares: [50, 25, 15, 10] },
    { name: 'Winner takes all', hint: '100', shares: [100] },
];
const PLACE_NAMES = ['1st place', '2nd place', '3rd place', '4th place'];

function MiniSplit({ shares }: { shares: number[] }) {
    return (
        <span className="flex h-1.5 w-full overflow-hidden bg-white/[0.06]" aria-hidden>
            {shares.map((s, i) => <span key={i} className="h-full border-r border-background bg-rose-500 last:border-r-0" style={{ width: `${s}%`, opacity: 1 - i * 0.22 }} />)}
        </span>
    );
}

const StepPrizeDistribution: React.FC<WizardStepProps> = ({ data, updateData, errors, isEditMode }) => {
    const config = data.prizeDistribution;
    const prizePool = parseFloat(data.prizePool) || 0;
    const currency = data.currency || 'USD';
    const placements: PrizeDistributionEntry[] = config?.placements ?? [];
    const hasRewards = placements.some((p) => p.rewards && p.rewards.length > 0);
    const isPaidEntry = Boolean(data.entryFee && data.entryFee.toLowerCase() !== 'free' && data.entryFee !== '0');

    const setPlacements = (next: PrizeDistributionEntry[]) =>
        updateData({ prizeDistribution: { mode: 'percentage', placements: next, disclaimer: config?.disclaimer } });
    const applySplit = (shares: number[]) =>
        updateData({
            prizeDistribution: {
                mode: 'percentage',
                placements: shares.map((percentage, i) => ({ position: i + 1, label: PLACE_NAMES[i], percentage, shared_count: 1, rewards: [] })),
            },
        });

    return (
        <WizardStepFrame
            title="Prizes and entry fee"
            description="What's up for grabs, what it costs to enter and how winnings are paid. All optional; you can add them from the dashboard later."
        >
            <FormSection title="Money">
                <div className="grid gap-5 sm:grid-cols-[140px_1fr_1fr]">
                    <Field label="Currency" htmlFor="currency">
                        <Select value={currency} onValueChange={(v) => updateData({ currency: v })} disabled={isEditMode}>
                            <SelectTrigger id="currency" className={CONTROL_CLASS}><SelectValue /></SelectTrigger>
                            <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                    </Field>
                    <Field label="Prize pool" htmlFor="prizePool" hint="Total cash across all places. 0 if there's no cash prize." error={errors.prizePool}>
                        <Input id="prizePool" inputMode="decimal" placeholder="e.g. 50000" value={data.prizePool} disabled={isEditMode}
                            onChange={(e) => updateData({ prizePool: e.target.value })} className={cn(CONTROL_CLASS, errors.prizePool && CONTROL_ERROR_CLASS)} />
                    </Field>
                    <Field label="Entry fee" htmlFor="entryFee" hint='Per team. Type "Free" for no fee.' error={errors.entryFee}>
                        <Input id="entryFee" placeholder="Free" value={data.entryFee} disabled={isEditMode}
                            onChange={(e) => updateData({ entryFee: e.target.value })} className={cn(CONTROL_CLASS, errors.entryFee && CONTROL_ERROR_CLASS)} />
                    </Field>
                </div>
                {isEditMode && <p className="text-xs text-zinc-500">{LOCKED}</p>}
                {isPaidEntry && (
                    <Field label="How players pay" htmlFor="paymentInstructions" hint="Shown during registration. Players upload a receipt, and you approve it from Payments.">
                        <Textarea
                            id="paymentInstructions" rows={4} value={data.paymentInstructions || ''}
                            placeholder={'Bank: ABC Bank, account 1234567890\nJazzCash / EasyPaisa: 0300-1234567\nUpload your receipt when you register.'}
                            onChange={(e) => updateData({ paymentInstructions: e.target.value })}
                            className={cn(CONTROL_CLASS, 'h-auto resize-y py-3 text-sm leading-relaxed')}
                        />
                    </Field>
                )}
            </FormSection>

            <FormSection title="Paying winners">
                <ChoiceGroup label="Payout method" columns={2}>
                    <ChoiceCard selected={data.payoutMethod === 'manual' || !data.payoutMethod} disabled={isEditMode} onSelect={() => updateData({ payoutMethod: 'manual' })}
                        title="You pay winners directly" description="Bank transfer, wallet or cash, outside Esportra." />
                    <ChoiceCard selected={false} disabled onSelect={() => undefined} badge="Soon"
                        title="Automatic payouts" description="Esportra pays winners for you through a payment gateway." />
                </ChoiceGroup>
                <Field label="Payout details for winners" htmlFor="manualPayoutNotes" optional hint="Shown to winning teams once results are final.">
                    <Textarea
                        id="manualPayoutNotes" rows={3} value={data.manualPayoutNotes || ''}
                        placeholder="e.g. Bank transfer within 7 days. Message us on Discord with your account details."
                        onChange={(e) => updateData({ manualPayoutNotes: e.target.value })}
                        className={cn(CONTROL_CLASS, 'h-auto resize-y py-3 text-sm leading-relaxed')}
                    />
                </Field>
            </FormSection>

            <FormSection
                title="How the pool is split"
                description={isEditMode ? LOCKED : prizePool > 0 ? `Out of ${formatCurrency(prizePool, currency)}.` : 'Set shares now or later from the Prizes panel.'}
            >
                {isEditMode ? (
                    placements.length > 0 ? (
                        <PrizeAllocationBar placements={placements} prizePool={prizePool} currency={currency} />
                    ) : (
                        <p className="text-sm text-zinc-500">No split set.</p>
                    )
                ) : (
                    <>
                        {placements.length === 0 && (
                            <ChoiceGroup label="Starting split" columns={3}>
                                {SPLITS.map((split) => (
                                    <ChoiceCard key={split.name} selected={false} onSelect={() => applySplit(split.shares)} title={split.name}
                                        description={`${split.hint}%`} meta={<MiniSplit shares={split.shares} />} />
                                ))}
                            </ChoiceGroup>
                        )}
                        {placements.length > 0 && <PrizeAllocationBar placements={placements} prizePool={prizePool} currency={currency} />}
                        <PrizeBandsEditor placements={placements} prizePool={prizePool} currency={currency} onChange={setPlacements} />
                        {hasRewards && (
                            <InlineNotice tone="neutral">
                                Players will see: trophies, products and other non-cash rewards are delivered by the organizer, not Esportra.
                            </InlineNotice>
                        )}
                        {placements.length > 0 && (
                            <button type="button" onClick={() => updateData({ prizeDistribution: null })} className="text-xs text-zinc-500 transition-colors hover:text-red-300">
                                Clear the split
                            </button>
                        )}
                    </>
                )}
            </FormSection>
        </WizardStepFrame>
    );
};

export default StepPrizeDistribution;
