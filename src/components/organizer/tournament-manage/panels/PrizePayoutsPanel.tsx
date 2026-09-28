import { useState, useEffect, useCallback } from 'react';
import { Loader2, Trophy, Plus, Trash2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import {
  CommandHeader,
  CommandSection,
  CommandActionBar,
  CommandButton,
  DirtyIndicator,
} from '@/components/management/CommandSurface';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import type { PrizeDistributionEntry, PrizeReward } from '@/types/prizeDistribution';
import { cn } from '@/lib/utils';

interface PrizePayoutsPanelProps {
  tournament: DashboardTournament;
  editableFields: Set<string>;
  onSave: () => void;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'PKR', 'INR', 'TRY', 'EGP', 'QAR', 'MYR', 'SGD', 'BRL', 'JPY', 'CAD', 'AUD'];

const REWARD_TYPES = [
  { value: 'physical_product', label: 'Physical Product' },
  { value: 'digital_product', label: 'Digital Product' },
  { value: 'in_game_currency', label: 'In-Game Currency' },
  { value: 'service', label: 'Service' },
  { value: 'trophy', label: 'Trophy / Medal' },
  { value: 'other', label: 'Other' },
];

const PAYOUT_METHODS = [
  { value: 'manual', label: 'Manual', description: 'Distribute winnings yourself outside the platform' },
  { value: 'gateway', label: 'Platform Escrow', description: 'Collect entry fees and release to winners' },
];

interface FormState {
  currency: string;
  prize_pool: string;
  entry_fee: string;
  payout_method: string;
  payment_instructions: string;
  manual_payout_notes: string;
}

const ORDINAL_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
function placementLabel(position: number): string {
  return ORDINAL_LABELS[position - 1] ?? `${position}th`;
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

  useEffect(() => {
    setForm({
      currency: tournament.currency || 'USD',
      prize_pool: tournament.prize_pool || '0',
      entry_fee: tournament.entry_fee || '0',
      payout_method: tournament.settings?.payoutMethod || 'manual',
      payment_instructions: tournament.payment_instructions || '',
      manual_payout_notes: tournament.manual_payout_notes || tournament.settings?.manualPayoutNotes || '',
    });
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
      toast({ title: 'Prize configuration saved' });
      onSave();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message || 'Please try again.', variant: 'destructive' });
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
  const [expandedRewards, setExpandedRewards] = useState<Record<number, boolean>>({});

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

  const handleAddPlacement = () => {
    const next = placements.length + 1;
    setPlacements((prev) => [
      ...prev,
      { position: next, label: `${placementLabel(next)} Place`, percentage: 0, shared_count: 1 },
    ]);
  };

  const handleRemovePlacement = (idx: number) => {
    setPlacements((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((p, i) => ({ ...p, position: i + 1, label: `${placementLabel(i + 1)} Place` })),
    );
  };

  const updatePlacement = (idx: number, patch: Partial<PrizeDistributionEntry>) => {
    setPlacements((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const handleAddReward = (placementIdx: number) => {
    const rewards: PrizeReward[] = [...(placements[placementIdx].rewards ?? []), { type: 'other', title: '', quantity: 1 }];
    updatePlacement(placementIdx, { rewards });
  };

  const handleUpdateReward = (placementIdx: number, rewardIdx: number, field: keyof PrizeReward, value: unknown) => {
    const rewards = (placements[placementIdx].rewards ?? []).map((r, i) => i === rewardIdx ? { ...r, [field]: value } : r);
    updatePlacement(placementIdx, { rewards });
  };

  const handleRemoveReward = (placementIdx: number, rewardIdx: number) => {
    const rewards = (placements[placementIdx].rewards ?? []).filter((_, i) => i !== rewardIdx);
    updatePlacement(placementIdx, { rewards });
  };

  const handleSaveDistribution = useCallback(async () => {
    if (!totalValid || savingDistribution) return;
    setSavingDistribution(true);
    try {
      await saveDistribution.mutateAsync({
        tournamentId: tournament.id,
        config: { mode: 'percentage', placements },
      });
      toast({ title: 'Prize distribution saved' });
    } catch (err: any) {
      toast({ title: 'Distribution save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSavingDistribution(false);
    }
  }, [totalValid, savingDistribution, saveDistribution, tournament.id, placements, toast]);

  return (
    <>
      <CommandHeader
        eyebrow="CONFIGURATION"
        title="Prize & Payouts"
        description="Set prize pool, entry fees, and how winners receive their winnings."
      />

      {/* Prize Configuration */}
      <CommandSection>
        <p className="mb-4 border-b border-white/[0.05] pb-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-rose-500/60">PRIZE POOL</p>
        <div className="space-y-4">
          {/* Currency */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Currency</Label>
            <div className={`flex flex-wrap gap-2 ${isFieldLocked('currency') ? 'pointer-events-none opacity-50' : ''}`}>
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, currency: c }))}
                  className={`border px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
                    form.currency === c
                      ? 'border-white bg-white text-black'
                      : 'border-white/[0.08] text-zinc-400 hover:border-white/25 hover:text-white'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Prize Pool ({form.currency})
              </Label>
              <div className="relative">
                <Trophy className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.prize_pool}
                  onChange={(e) => setForm((s) => ({ ...s, prize_pool: e.target.value }))}
                  disabled={isFieldLocked('prize_pool')}
                  placeholder="0"
                  className="border-white/10 bg-black/30 pl-8 text-white placeholder:text-zinc-600 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Entry Fee ({form.currency})
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.entry_fee}
                onChange={(e) => setForm((s) => ({ ...s, entry_fee: e.target.value }))}
                disabled={isFieldLocked('entry_fee')}
                placeholder="0"
                className="border-white/10 bg-black/30 text-white placeholder:text-zinc-600 disabled:opacity-50"
              />
              <p className="text-sm text-zinc-400">Set 0 for free entry.</p>
            </div>
          </div>

          {/* Payout Method */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Payout Method</Label>
            <div className={`grid gap-2 sm:grid-cols-2 ${isFieldLocked('entry_fee') ? 'pointer-events-none opacity-50' : ''}`}>
              {PAYOUT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, payout_method: method.value }))}
                  className={`flex flex-col items-start border p-2.5 text-left transition-colors ${
                    form.payout_method === method.value
                      ? 'border-rose-500/40 bg-rose-500/[0.06]'
                      : 'border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <span className="text-sm font-semibold text-white">{method.label}</span>
                  <span className="mt-0.5 text-sm leading-relaxed text-zinc-400">{method.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Instructions — only when entry fee is set */}
          {Number(form.entry_fee) > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Payment Instructions</Label>
              <p className="text-sm text-zinc-400">Shown to participants so they know where to send payment (e.g. bank account, PayPal, JazzCash).</p>
              <Textarea
                value={form.payment_instructions}
                onChange={(e) => setForm((s) => ({ ...s, payment_instructions: e.target.value }))}
                placeholder="e.g. Bank: Account #1234567890 — Name: John Doe / PayPal: organizer@email.com"
                rows={3}
                maxLength={1000}
                className="border-white/10 bg-black/30 text-white placeholder:text-zinc-600 resize-none"
              />
            </div>
          )}

          {/* Manual Payout Notes — only when manual method and entry fee is set */}
          {form.payout_method === 'manual' && Number(form.entry_fee) > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Manual Payout Notes</Label>
              <Textarea
                value={form.manual_payout_notes}
                onChange={(e) => setForm((s) => ({ ...s, manual_payout_notes: e.target.value }))}
                placeholder="Internal notes for manual payout processing..."
                rows={3}
                className="border-white/10 bg-black/30 text-white placeholder:text-zinc-600 resize-none"
              />
            </div>
          )}
        </div>
      </CommandSection>

      <CommandActionBar>
        <div className="flex items-center gap-3">
          <DirtyIndicator isDirty={isDirty} />
          <CommandButton
            onClick={handleSave}
            disabled={!isDirty || saving}
            variant="primary"
            size="sm"
            slide
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </CommandButton>
        </div>
      </CommandActionBar>

      {/* Prize Distribution Editor */}
      <CommandSection>
        <div className="mb-4 flex items-center justify-between border-b border-white/[0.05] pb-2.5">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-rose-500/60">PRIZE DISTRIBUTION</p>
          {(tournament.status === 'ongoing' || tournament.status === 'completed') && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              Live — changes affect payouts
            </span>
          )}
        </div>

        {/* Template Picker */}
        {templates && templates.length > 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-xs font-semibold text-zinc-400">Apply Template</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {templates.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => handleApplyTemplate(t)}
                  className="shrink-0 border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-left transition-colors hover:border-white/20 hover:bg-white/[0.04]"
                >
                  <p className="text-xs font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-zinc-500">{t.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Placement Table */}
        <div className="space-y-2">
          {placements.length === 0 ? (
            <p className="text-sm text-zinc-600">No distribution configured. Apply a template or add placements manually.</p>
          ) : (
            <div className="space-y-1.5">
              {/* Header */}
              <div className="grid grid-cols-[1fr_100px_32px_32px] gap-2 px-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Placement</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">% Share</span>
                <span />
                <span />
              </div>
              {placements.map((p, idx) => (
                <div key={idx} className="border border-white/[0.06] bg-white/[0.01]">
                  <div className="grid grid-cols-[1fr_100px_32px_32px] items-center gap-2 px-3 py-2">
                    <span className="text-sm font-medium text-white">{p.label || `${placementLabel(p.position)} Place`}</span>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={p.percentage}
                        onChange={(e) => updatePlacement(idx, { percentage: parseFloat(e.target.value) || 0 })}
                        className="h-7 border-white/10 bg-transparent pr-5 text-right text-sm text-white"
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedRewards((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                      title="Add non-cash rewards"
                      className="flex h-7 w-7 items-center justify-center text-zinc-500 hover:text-white transition-colors"
                    >
                      {expandedRewards[idx] ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePlacement(idx)}
                      className="flex h-7 w-7 items-center justify-center text-zinc-600 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {expandedRewards[idx] && (
                    <div className="border-t border-white/[0.05] bg-black/20 px-3 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Non-Cash Rewards</span>
                        <button
                          type="button"
                          onClick={() => handleAddReward(idx)}
                          className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                        >
                          <Plus className="h-3 w-3" /> Add Reward
                        </button>
                      </div>
                      {(p.rewards ?? []).length === 0 ? (
                        <p className="text-xs text-zinc-600">No non-cash rewards. Add trophies, peripherals, in-game items, services, etc.</p>
                      ) : (
                        (p.rewards ?? []).map((reward, ri) => (
                          <div key={ri} className="flex items-center gap-2">
                            <select
                              value={reward.type}
                              onChange={(e) => handleUpdateReward(idx, ri, 'type', e.target.value)}
                              className="h-8 shrink-0 border border-white/10 bg-black/40 px-2 text-xs text-white focus:outline-none focus:border-rose-500"
                            >
                              {REWARD_TYPES.map((rt) => (
                                <option key={rt.value} value={rt.value}>{rt.label}</option>
                              ))}
                            </select>
                            <Input
                              value={reward.title}
                              onChange={(e) => handleUpdateReward(idx, ri, 'title', e.target.value)}
                              placeholder="Reward title"
                              className="h-8 flex-1 border-white/10 bg-transparent text-xs text-white placeholder:text-zinc-600"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveReward(idx, ri)}
                              className="flex h-7 w-7 items-center justify-center text-zinc-600 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Placement */}
          <button
            type="button"
            onClick={handleAddPlacement}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Placement
          </button>

          {/* Total */}
          {placements.length > 0 && (
            <div className={cn(
              'flex items-center justify-between border px-3 py-2 text-sm font-semibold',
              totalValid
                ? 'border-emerald-500/30 bg-emerald-500/[0.05] text-emerald-400'
                : 'border-amber-500/30 bg-amber-500/[0.05] text-amber-400'
            )}>
              <span>Total</span>
              <span>{totalPct.toFixed(1)}%{!totalValid && ' — must equal 100%'}</span>
            </div>
          )}
        </div>

        {placements.length > 0 && (
          <div className="mt-3 flex justify-end">
            <CommandButton
              onClick={handleSaveDistribution}
              disabled={!totalValid || savingDistribution}
              variant="primary"
              size="sm"
            >
              {savingDistribution ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Distribution'}
            </CommandButton>
          </div>
        )}
      </CommandSection>

      {/* Payout records — existing read-only section for completed tournaments */}
      <PrizeDistributionTab tournament={tournament} />
    </>
  );
}
