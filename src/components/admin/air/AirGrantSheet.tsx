import { useEffect, useState } from 'react';
import { CommandButton } from '@/components/management/CommandSurface';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useAirGrant, useAirList, type AirPlan, type AirStatus } from '@/hooks/useAirAdmin';
import { AirChoice } from './AirChoice';
import { AirField } from './AirField';
import { accessLine, dateInDays, endOfDay, errorText, fieldClass, readLimit } from './airFormat';

export interface AirGrantTarget {
  userId: string;
  email: string | null;
  name: string | null;
  status: AirStatus | null;
  planId?: string;
  validUntil: string | null;
  trialEndsAt: string | null;
  overrideDeviceLimits?: boolean;
  productionLimit?: number | null;
  captureLimit?: number | null;
}

const STATUSES: { value: AirStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'revoked', label: 'Revoked' },
];
const QUICK = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
  { value: 'none', label: 'No end' },
];

function planLabel(p: AirPlan) {
  const pcs = (n: number | null, kind: string) => (n === null ? `any ${kind} PCs` : `${n} ${kind} PC${n === 1 ? '' : 's'}`);
  return `${p.name} · ${pcs(p.productionLimit, 'production')}, ${pcs(p.captureLimit, 'capture')}`;
}

export function AirGrantSheet({ target, onClose }: { target: AirGrantTarget | null; onClose: () => void }) {
  const plans = useAirList<AirPlan>('plans').data?.items.filter((p) => p.enabled) ?? [];
  const grant = useAirGrant();
  const [status, setStatus] = useState<AirStatus>('active');
  const [planId, setPlanId] = useState('');
  const [until, setUntil] = useState(dateInDays(90));
  const [custom, setCustom] = useState(false);
  const [production, setProduction] = useState('');
  const [capture, setCapture] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!target) return;
    const stillActive = target.validUntil && new Date(target.validUntil).getTime() > Date.now();
    setStatus('active');
    setPlanId(target.planId ?? '');
    setUntil(stillActive ? target.validUntil!.slice(0, 10) : dateInDays(90));
    setCustom(!!target.overrideDeviceLimits);
    setProduction(target.productionLimit == null ? '' : String(target.productionLimit));
    setCapture(target.captureLimit == null ? '' : String(target.captureLimit));
    setReason('');
    setError('');
    grant.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset the form only when another person is opened
  }, [target?.userId]);

  const chosenPlan = planId || plans[0]?.id || '';
  const quick = until === '' ? 'none' : QUICK.find((q) => q.value !== 'none' && dateInDays(Number(q.value)) === until)?.value ?? null;

  async function submit() {
    if (!target) return;
    const validUntil = until === '' ? null : endOfDay(until);
    const productionLimit = custom ? readLimit(production) : null;
    const captureLimit = custom ? readLimit(capture) : null;
    if (!chosenPlan) return setError('Add an Air plan first (Plans tab).');
    if (until !== '' && !validUntil) return setError('Choose a valid end date, or No end.');
    if (status === 'active' && validUntil && new Date(validUntil).getTime() <= Date.now()) return setError('Choose an end date in the future.');
    if (productionLimit === 'invalid' || captureLimit === 'invalid') return setError('PC limits are 0 to 1000, or empty for no limit.');
    if (!reason.trim()) return setError('Write a reason. It is kept in Activity.');
    setError('');
    try {
      await grant.mutateAsync({
        userId: target.userId,
        input: { planId: chosenPlan, validUntil, status, reason: reason.trim(), overrideDeviceLimits: custom, productionLimit, captureLimit },
      });
      onClose();
    } catch (e) {
      setError(errorText(e, 'Access could not be changed.'));
    }
  }

  return (
    <Sheet open={!!target} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full max-w-[440px] overflow-y-auto rounded-none border-l border-white/10 bg-[#111114] p-6 sm:max-w-[440px]">
        <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">Grant access</div>
        <SheetTitle className="mt-1 break-all text-xl font-semibold text-white">{target?.email ?? target?.name ?? 'This account'}</SheetTitle>
        <SheetDescription className="mt-1 text-xs text-zinc-500">
          {target ? accessLine(target.status, target.validUntil, target.trialEndsAt) : ''}
        </SheetDescription>
        <div className="mt-6 space-y-5">
          <AirField label="Status"><AirChoice options={STATUSES} value={status} onChange={setStatus} /></AirField>
          <AirField label="Plan">
            <select className={fieldClass} value={chosenPlan} onChange={(e) => setPlanId(e.target.value)}>
              {plans.length === 0 ? <option value="">No plans yet</option> : null}
              {plans.map((p) => <option key={p.id} value={p.id}>{planLabel(p)}</option>)}
            </select>
          </AirField>
          <AirField label="Access until">
            <AirChoice options={QUICK} value={quick} onChange={(v) => setUntil(v === 'none' ? '' : dateInDays(Number(v)))} />
            <input type="date" className={`${fieldClass} mt-2`} value={until} onChange={(e) => setUntil(e.target.value)} aria-label="End date" />
          </AirField>
          <AirField label="PC limits">
            <AirChoice
              options={[{ value: 'plan', label: 'From the plan' }, { value: 'custom', label: 'Custom for this person' }]}
              value={custom ? 'custom' : 'plan'}
              onChange={(v) => setCustom(v === 'custom')}
            />
            {custom ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input className={fieldClass} inputMode="numeric" placeholder="Production · no limit" value={production} onChange={(e) => setProduction(e.target.value)} aria-label="Production PCs" />
                <input className={fieldClass} inputMode="numeric" placeholder="Capture · no limit" value={capture} onChange={(e) => setCapture(e.target.value)} aria-label="Capture PCs" />
              </div>
            ) : null}
          </AirField>
          <AirField label="Reason (kept in Activity)">
            <textarea className={`${fieldClass} min-h-[84px]`} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          </AirField>
          {error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}
          <p className="text-xs text-zinc-500">Air picks up the change at its next check (about a minute) or when the person presses Check again.</p>
          <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
            <CommandButton variant="ghost" size="sm" onClick={onClose}>Cancel</CommandButton>
            <CommandButton size="sm" disabled={grant.isPending} onClick={submit}>
              {status === 'active' ? 'Grant access' : 'Save'}
            </CommandButton>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
