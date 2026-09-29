import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { CommandButton, CommandHeader, CommandSection } from '@/components/management/CommandSurface';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChoiceCard, ChoiceGroup, CONTROL_CLASS, Field, FormSection, FORM_MEASURE_CLASS, InlineNotice } from '@/components/ui/kit';
import { PrizeAllocationBar } from '@/components/tournament/wizard/PrizeAllocationBar';
import { PrizeBandsEditor } from '@/components/tournament/wizard/PrizeBandsEditor';
import { formatCurrency } from '@/utils/formatCurrency';
import { PanelSaveBar } from '../PanelSaveBar';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import { useDirtyState } from '@/components/organizer/tournament-manage/TournamentDashboardShell';
import { PrizeDistributionTab } from '@/components/organizer/PrizeDistributionTab';
import {
  usePrizeDistribution,
  usePrizeDistributionTemplates,
  useSavePrizeDistribution,
} from '@/hooks/usePrizeDistribution';
import type { DashboardTournament } from '@/hooks/useTournamentDashboard';
import type { PrizeDistributionEntry } from '@/types/prizeDistribution';
import { cn } from '@/lib/utils';

interface PrizePayoutsPanelProps {
  tournament: DashboardTournament;
  editableFields: Set<string>;
  onSave: () => void;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'PKR', 'INR', 'TRY', 'EGP', 'QAR', 'MYR', 'SGD', 'BRL', 'JPY', 'CAD', 'AUD'];

const PAYOUT_METHODS = [
  { value: 'manual', label: 'You pay winners directly', description: 'Bank transfer, wallet or cash, outside Esportra.' },
  { value: 'gateway', label: 'Esportra holds and pays out', description: 'Entry fees are held and released to winners automatically.' },
];

interface FormState {
  currency: string;
  prize_pool: string;
  entry_fee: string;
  payout_method: string;
  payment_instructions: string;
  manual_payout_notes: string;
}

export function PrizePayoutsPanel({ tournament, editableFields, onSave }: PrizePayoutsPanelProps) {
  const { toast } = useToast();
  const { setDirty } = useDirtyState();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>({
    currency: tournament.currency || 'USD',
    prize_pool: tournament.prize_pool || '0',
    entry_fee: tournament.entry_fee || '0',
    payout_method: tournament.settings?.payoutMethod || 'manual',
    payment_instructions: tournament.payment_instructions || '',
    manual_payout_notes: tournament.manual_payout_notes || tournament.settings?.manualPayoutNotes || '',
  });

  const resetForm = () => setForm({
      currency: tournament.currency || 'USD',
      prize_pool: tournament.prize_pool || '0',
      entry_fee: tournament.entry_fee || '0',
      payout_method: tournament.settings?.payoutMethod || 'manual',
      payment_instructions: tournament.payment_instructions || '',
      manual_payout_notes: tournament.manual_payout_notes || tournament.settings?.manualPayoutNotes || '',
    });

  useEffect(() => {
    resetForm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament.id, tournament.updated_at]); // Intentional: reset only on entity identity change

  const isDirty =
    form.currency !== (tournament.currency || 'USD') ||
    form.prize_pool !== (tournament.prize_pool || '0') ||
    form.entry_fee !== (tournament.entry_fee || '0') ||
    form.payout_method !== (tournament.settings?.payoutMethod || 'manual') ||
    form.payment_instructions !== (tournament.payment_instructions || '') ||
    form.manual_payout_notes !== (tournament.manual_payout_notes || tournament.settings?.manualPayoutNotes || '');

  useEffect(() => {
    setDirty(isDirty);
    return () => setDirty(false);
  }, [isDirty, setDirty]);

  const isFieldLocked = (field: string) => !editableFields.has('*') && !editableFields.has(field);

  const handleSave = useCallback(async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      await apiClient.put(`/api/tournaments/${tournament.id}`, {
        currency: form.currency,
        prizePool: form.prize_pool,
        entryFee: form.entry_fee,
        payoutMethod: form.payout_method,
        paymentInstructions: form.payment_instructions.trim() || null,
        manualPayoutNotes: form.manual_payout_notes.trim() || null,
        settings: {
          ...tournament.settings,
          payoutMethod: form.payout_method,
        },
      });
      toast({ title: 'Saved', description: 'Prize pool and fees updated.' });
      onSave();
    } catch (err: any) {
      toast({ title: "Couldn't save", description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [isDirty, saving, form, tournament, toast, onSave]);

  // Prize distribution editor state
  const { data: existingDistribution } = usePrizeDistribution(tournament.id);
  const { data: templates } = usePrizeDistributionTemplates(tournament.id);
  const saveDistribution = useSavePrizeDistribution();

  const [placements, setPlacements] = useState<PrizeDistributionEntry[]>([]);
  const [savingDistribution, setSavingDistribution] = useState(false);
  useEffect(() => {
    if (existingDistribution?.placements) {
      setPlacements(existingDistribution.placements);
    }
  }, [existingDistribution]);

  const totalPct = placements.reduce((sum, p) => sum + (Number(p.percentage) || 0), 0);
  const totalValid = Math.abs(totalPct - 100) < 0.01;

  const handleApplyTemplate = (template: { distribution: { placements: PrizeDistributionEntry[] } }) => {
    setPlacements(template.distribution.placements.map((p) => ({ ...p })));
  };

  const handleSaveDistribution = useCallback(async () => {
    if (!totalValid || savingDistribution) return;
    setSavingDistribution(true);
    try {
      await saveDistribution.mutateAsync({
        tournamentId: tournament.id,
        config: { mode: 'percentage', placements },
      });
      toast({ title: 'Split saved', description: 'Winners see these shares on the tournament page.' });
    } catch (err: any) {
      toast({ title: "Couldn't save the split", description: err.message, variant: 'destructive' });
    } finally {
      setSavingDistribution(false);
    }
  }, [totalValid, savingDistribution, saveDistribution, tournament.id, placements, toast]);

  const prizePool = Number(form.prize_pool) || 0;
  const entryFee = Number(form.entry_fee) || 0;
  const isLive = tournament.status === 'ongoing' || tournament.status === 'completed';
  const lockNote = 'Locked once the tournament is live, because players signed up under these terms.';

  return (
    <>
      <CommandHeader
        eyebrow="Configure"
        title="Prize and payouts"
        description="What's up for grabs, what it costs to enter, how the pool is split and how winners get paid."
      />

      <CommandSection>
        <div className={FORM_MEASURE_CLASS}>
          <FormSection title="Money">
            <div className="grid gap-5 sm:grid-cols-[140px_1fr_1fr]">
              <Field label="Currency" htmlFor="pp-currency">
                <Select value={form.currency} onValueChange={(v) => setForm((s) => ({ ...s, currency: v }))} disabled={isFieldLocked('currency')}>
                  <SelectTrigger id="pp-currency" className={CONTROL_CLASS}><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Prize pool" htmlFor="pp-pool" hint="Total cash across all places.">
                <Input id="pp-pool" type="number" min="0" step="1" value={form.prize_pool} placeholder="0" disabled={isFieldLocked('prize_pool')}
                  onChange={(e) => setForm((s) => ({ ...s, prize_pool: e.target.value }))} className={CONTROL_CLASS} />
              </Field>
              <Field label="Entry fee" htmlFor="pp-fee" hint="Per team. 0 for free entry.">
                <Input id="pp-fee" type="number" min="0" step="0.01" value={form.entry_fee} placeholder="0" disabled={isFieldLocked('entry_fee')}
                  onChange={(e) => setForm((s) => ({ ...s, entry_fee: e.target.value }))} className={CONTROL_CLASS} />
              </Field>
            </div>
            {(isFieldLocked('prize_pool') || isFieldLocked('entry_fee')) && <p className="text-xs text-zinc-500">{lockNote}</p>}
            {entryFee > 0 && (
              <Field label="How players pay" htmlFor="pp-instructions" hint="Shown during registration. Players upload a receipt that you approve from Payments.">
                <Textarea id="pp-instructions" value={form.payment_instructions} maxLength={1000} rows={3}
                  placeholder={'Bank: ABC Bank, account 1234567890\nJazzCash / EasyPaisa: 0300-1234567'}
                  onChange={(e) => setForm((s) => ({ ...s, payment_instructions: e.target.value }))}
                  className={cn(CONTROL_CLASS, 'h-auto resize-y py-3 text-sm leading-relaxed')} />
              </Field>
            )}
          </FormSection>

          <FormSection title="Paying winners">
            <ChoiceGroup label="Payout method" columns={2}>
              {PAYOUT_METHODS.map((method) => {
                const unavailable = method.value === 'gateway' && form.payout_method !== 'gateway';
                return (
                  <ChoiceCard key={method.value} selected={form.payout_method === method.value}
                    disabled={isFieldLocked('entry_fee') || unavailable} badge={unavailable ? 'Soon' : undefined}
                    onSelect={() => setForm((s) => ({ ...s, payout_method: method.value }))} title={method.label} description={method.description} />
                );
              })}
            </ChoiceGroup>
            {form.payout_method === 'manual' && (prizePool > 0 || entryFee > 0) && (
              <Field label="Payout details" htmlFor="pp-notes" optional hint="How and when you'll pay winners, e.g. bank transfer within 7 days.">
                <Textarea id="pp-notes" value={form.manual_payout_notes} rows={3} placeholder="Bank transfer within 7 days. Message us on Discord with your account details."
                  onChange={(e) => setForm((s) => ({ ...s, manual_payout_notes: e.target.value }))}
                  className={cn(CONTROL_CLASS, 'h-auto resize-y py-3 text-sm leading-relaxed')} />
              </Field>
            )}
          </FormSection>
        </div>
      </CommandSection>

      <PanelSaveBar isDirty={isDirty} saving={saving} onSave={handleSave} onDiscard={resetForm} />

      <CommandSection>
        <div className={FORM_MEASURE_CLASS}>
          <FormSection
            title="How the pool is split"
            description={prizePool > 0 ? `Shares of ${formatCurrency(prizePool, form.currency)}. Saved separately from the settings above.` : 'Shares of the prize pool. Saved separately from the settings above.'}
          >
            {isLive && (
              <InlineNotice tone="warning">The tournament is live. Changing the split changes what winners are owed.</InlineNotice>
            )}
            {templates && templates.length > 0 && placements.length === 0 && (
              <ChoiceGroup label="Starting split" columns={3}>
                {templates.map((t) => (
                  <ChoiceCard key={t.name} selected={false} onSelect={() => handleApplyTemplate(t)} title={t.name} description={t.description} />
                ))}
              </ChoiceGroup>
            )}
            {placements.length > 0 && <PrizeAllocationBar placements={placements} prizePool={prizePool} currency={form.currency} />}
            <PrizeBandsEditor placements={placements} prizePool={prizePool} currency={form.currency} onChange={setPlacements} />
            {placements.length > 0 && (
              <div className="flex items-center justify-between gap-3">
                <p className={cn('text-xs', totalValid ? 'text-zinc-500' : 'text-amber-200')}>
                  {totalValid ? 'Shares add up to 100%.' : `Shares add up to ${totalPct.toFixed(1)}%. They need to total 100% to save.`}
                </p>
                <CommandButton onClick={handleSaveDistribution} disabled={!totalValid || savingDistribution} variant="primary" size="sm">
                  {savingDistribution ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Saving" /> : 'Save split'}
                </CommandButton>
              </div>
            )}
          </FormSection>
        </div>
      </CommandSection>

      {/* Payout records — existing read-only section for completed tournaments */}
      <PrizeDistributionTab tournament={tournament} />
    </>
  );
}
