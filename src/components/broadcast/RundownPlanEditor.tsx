import { useState } from 'react';
import { CommandButton } from '@/components/management/CommandSurface';
import { CONTROL_CLASS } from '@/components/ui/kit/tone';
import { SCREEN_CATALOG } from '@/services/broadcast/screenCatalog';
import { CUE_TRIGGERS, AUTOMATIC_CUES, cueLabel, rundownPlanSchema, type RundownPlan } from '@/schemas/rundownPlanSchema';
import { useRundownPlanWrites } from '@/hooks/useRundownPlans';
import { getApiErrorMessage } from '@/lib/apiClient';
import type { ShowSegment } from '@/types/broadcast';
const control = `${CONTROL_CLASS} mt-1 h-9 w-full px-2 text-sm`;
export function RundownPlanEditor({ segment }: { segment: ShowSegment }) {
  const [plan, setPlan] = useState<RundownPlan>(segment.plan || { trigger: 'manual', mode: 'manual', holdMode: 'manual', holdSeconds: 5, graphics: segment.overlay ? [segment.overlay] : [], scene: null, transition: { mode: 'current' }, mapNumber: null });
  const [notice, setNotice] = useState('');
  const { savePlan } = useRundownPlanWrites(segment.showId);
  const patch = (values: Partial<RundownPlan>) => setPlan(current => ({ ...current, ...values }));
  async function save() {
    const result = rundownPlanSchema.safeParse(plan);
    if (!result.success) { setNotice(result.error.issues[0].message); return; }
    try { await savePlan.mutateAsync({ segmentId: segment.id, plan: result.data }); setNotice('Item flow saved. Send the updated plan when ready.'); }
    catch (error) { setNotice(getApiErrorMessage(error, 'Could not save item flow. Keep your changes and retry.')); }
  }
  return <details className="px-4 pb-3 text-sm text-zinc-400">
    <summary className="cursor-pointer py-2">Cue & take settings · {cueLabel(plan.trigger)} · {plan.mode === 'automatic' ? 'Automatic' : 'Manual Take'}</summary>
    <p className="mb-3 text-xs">Match details stay linked to Esportra. These settings control this broadcast item.</p>
    <fieldset disabled={savePlan.isPending} className="grid grid-cols-2 gap-3">
      <label>Cue<select aria-label="Item cue" className={control} value={plan.trigger} onChange={event => patch({ trigger: event.target.value as RundownPlan['trigger'], ...(!AUTOMATIC_CUES.includes(event.target.value) ? { mode: 'manual' as const } : {}) })}>{CUE_TRIGGERS.map(trigger => <option key={trigger} value={trigger}>{cueLabel(trigger)}</option>)}</select></label>
      <label>Take mode<select aria-label="Item take mode" className={control} value={plan.mode} onChange={event => patch({ mode: event.target.value as RundownPlan['mode'] })}><option value="manual">Manual Take</option><option value="automatic" disabled={!AUTOMATIC_CUES.includes(plan.trigger)}>Automatic after live cue</option></select></label>
      <label>Hold<select aria-label="Item hold policy" className={control} value={plan.holdMode} onChange={event => patch({ holdMode: event.target.value as RundownPlan['holdMode'] })}><option value="manual">Wait for Take or Skip</option><option value="window">Countdown window</option><option value="immediate">Take immediately</option></select></label>
      <label>Hold seconds<input aria-label="Item hold seconds" className={control} type="number" min="1" max="60" disabled={plan.holdMode !== 'window'} value={plan.holdSeconds} onChange={event => patch({ holdSeconds: Number(event.target.value) })} /></label>
      <label>Broadcast screen<select aria-label="Item graphic screen" className={control} value={plan.graphics[0] || ''} onChange={event => patch({ graphics: event.target.value ? [event.target.value] : [] })}><option value="">Use the type’s default layout</option>{SCREEN_CATALOG.map(screen => <option key={screen.overlay} value={screen.overlay}>{screen.name}</option>)}</select></label>
      <label>Map scope<input aria-label="Item map scope" className={control} type="number" min="1" max="9" placeholder="Any map" value={plan.mapNumber || ''} onChange={event => patch({ mapNumber: event.target.value ? Number(event.target.value) : null })} /></label>
      <label className="col-span-2">OBS scene override<input aria-label="Item OBS scene" className={control} maxLength={256} placeholder="Use the screen’s scene, or map it on desktop" value={plan.scene || ''} onChange={event => patch({ scene: event.target.value || null })} /></label>
      <label>Transition<select aria-label="Item transition" className={control} value={plan.transition?.mode || 'current'} onChange={event => patch({ transition: { mode: event.target.value as 'current' | 'cut' | 'fade' | 'stinger', ...(event.target.value === 'fade' ? { durationMs: 300 } : {}) } })}><option value="current">Current OBS transition</option><option value="cut">Cut</option><option value="fade">Fade</option><option value="stinger">Stinger</option></select></label>
      {plan.transition?.mode !== 'current' && <label>Name from OBS<input aria-label="Item OBS transition name" className={control} maxLength={256} value={plan.transition?.name || ''} onChange={event => patch({ transition: { ...plan.transition!, name: event.target.value || null } })} /></label>}
      {plan.transition?.mode === 'fade' && <label>Fade milliseconds<input aria-label="Item fade duration" className={control} type="number" min="50" max="10000" value={plan.transition.durationMs || 300} onChange={event => patch({ transition: { ...plan.transition!, durationMs: Number(event.target.value) } })} /></label>}
    </fieldset>
    {!AUTOMATIC_CUES.includes(plan.trigger) && <p className="my-3 text-xs">This cue is a reminder for the operator. Use Take; automatic delivery for this cue is unavailable.</p>}
    {plan.mode === 'automatic' && <p className="my-3 text-xs">A live matching cue arms this item. Technical pause, timeout and operator Hold stop automatic takes. Verify the map number before using a map-specific cue.</p>}
    <CommandButton size="sm" variant="secondary" className="mt-3" disabled={savePlan.isPending} onClick={() => void save()}>{savePlan.isPending ? 'Saving…' : 'Save item flow'}</CommandButton>
    {notice && <p className="mt-2" role="status">{notice}</p>}
  </details>;
}
