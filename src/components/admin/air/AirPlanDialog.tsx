import { useEffect, useState } from 'react';
import { CommandButton } from '@/components/management/CommandSurface';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useAirSavePlan, type AirPlan } from '@/hooks/useAirAdmin';
import { AirChoice } from './AirChoice';
import { AirField } from './AirField';
import { errorText, fieldClass, readLimit } from './airFormat';

/** Adds a plan (`plan` = 'new') or edits one. */
export function AirPlanDialog({ plan, onClose }: { plan: AirPlan | 'new' | null; onClose: () => void }) {
  const save = useAirSavePlan();
  const [name, setName] = useState('');
  const [production, setProduction] = useState('');
  const [capture, setCapture] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState('');
  const editing = plan && plan !== 'new' ? plan : null;

  useEffect(() => {
    if (!plan) return;
    setName(editing?.name ?? '');
    setProduction(editing?.productionLimit == null ? '' : String(editing.productionLimit));
    setCapture(editing?.captureLimit == null ? '' : String(editing.captureLimit));
    setEnabled(editing?.enabled ?? true);
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when another plan is opened
  }, [plan]);

  async function submit() {
    const productionLimit = readLimit(production);
    const captureLimit = readLimit(capture);
    if (!name.trim() || name.trim().length > 80) return setError('Name the plan (up to 80 characters).');
    if (productionLimit === 'invalid' || captureLimit === 'invalid') return setError('PC limits are 0 to 1000, or empty for no limit.');
    try {
      await save.mutateAsync({ id: editing?.id, input: { name: name.trim(), productionLimit, captureLimit, enabled } });
      onClose();
    } catch (e) {
      setError(errorText(e, 'The plan could not be saved.'));
    }
  }

  return (
    <Dialog open={!!plan} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md rounded-none border border-white/10 bg-[#111114] p-6">
        <DialogTitle className="text-lg font-semibold text-white">{editing ? `Edit ${editing.name}` : 'New plan'}</DialogTitle>
        <DialogDescription className="text-sm text-zinc-400">Changing a plan updates everyone on it at their next check.</DialogDescription>
        <div className="mt-3 space-y-4">
          <AirField label="Name"><input className={fieldClass} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></AirField>
          <div className="grid grid-cols-2 gap-3">
            <AirField label="Production PCs"><input className={fieldClass} inputMode="numeric" placeholder="No limit" value={production} onChange={(e) => setProduction(e.target.value)} /></AirField>
            <AirField label="Capture PCs"><input className={fieldClass} inputMode="numeric" placeholder="No limit" value={capture} onChange={(e) => setCapture(e.target.value)} /></AirField>
          </div>
          <AirField label="Can be granted">
            <AirChoice options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]} value={enabled ? 'on' : 'off'} onChange={(v) => setEnabled(v === 'on')} />
          </AirField>
          {error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <CommandButton variant="ghost" size="sm" onClick={onClose}>Cancel</CommandButton>
          <CommandButton size="sm" disabled={save.isPending} onClick={submit}>Save plan</CommandButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
