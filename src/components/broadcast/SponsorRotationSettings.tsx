import { useEffect, useRef, useState } from 'react';
import { useBroadcastAppearance } from '@/hooks/useBroadcastAppearance';
import { DEFAULT_APPEARANCE, broadcastAppearanceSchema } from '@/schemas/broadcastAppearanceSchema';
import { CommandButton } from '@/components/management/CommandSurface';
import { getApiErrorMessage } from '@/lib/apiClient';
export function SponsorRotationSettings({ showId, locked }: { showId: string; locked: boolean }) {
  const { query, save } = useBroadcastAppearance(showId), loaded = useRef(false);
  const [value, setValue] = useState(DEFAULT_APPEARANCE), [error, setError] = useState('');
  useEffect(() => { if (query.data && !loaded.current) { loaded.current = true; setValue(query.data); } }, [query.data]);
  const disabled = locked || !query.data || save.isPending;
  function submit() {
    const parsed = broadcastAppearanceSchema.safeParse(value);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    void save.mutateAsync(parsed.data).then(saved => { setValue(saved); setError(''); }).catch(failure => setError(getApiErrorMessage(failure, 'Could not save rotation.')));
  }
  return <details className="setup-help"><summary>Sponsor logo rotation</summary>
    <p className="setup-hint">Active logos rotate on the in-game HUD while its player panels are visible. When rotation is off, the first active sponsor stays visible. Sponsor reads are started separately in Air.</p>
    {query.isLoading && <p role="status">Loading saved rotation…</p>}
    {query.isError && <p role="alert">Could not load rotation. <CommandButton onClick={() => void query.refetch()}>Retry</CommandButton></p>}
    <label><input type="checkbox" disabled={disabled} checked={value.sponsorRotation} onChange={event => setValue({ ...value, sponsorRotation: event.target.checked })} /> Rotate active sponsor logos</label>
    <label className="setup-field">Seconds per sponsor<input type="number" min={5} max={120} disabled={disabled || !value.sponsorRotation} value={value.sponsorSeconds} onChange={event => setValue({ ...value, sponsorSeconds: Number(event.target.value) })} /></label>
    <CommandButton disabled={disabled} onClick={submit}>Save sponsor rotation</CommandButton>
    {save.isSuccess && <p role="status">Sponsor rotation saved.</p>}
    {!!error && <p role="alert">{error} <CommandButton onClick={() => void query.refetch().then(result => { if (result.data) setValue(result.data); setError(''); })}>Reload saved rotation</CommandButton></p>}
  </details>;
}
