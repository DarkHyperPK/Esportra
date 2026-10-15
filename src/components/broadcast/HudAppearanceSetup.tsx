import { useEffect, useRef, useState } from 'react';
import { useBroadcastAppearance } from '@/hooks/useBroadcastAppearance';
import { DEFAULT_APPEARANCE, broadcastAppearanceSchema, type BroadcastAppearance } from '@/schemas/broadcastAppearanceSchema';
import { getApiErrorMessage } from '@/lib/apiClient';
import { CommandButton } from '@/components/management/CommandSurface';
import type { BroadcastShowDetail, ShowMatchSlot } from '@/types/broadcast';
import { HudSetupPreview } from './HudSetupPreview';
import { HudAppearanceFields } from './HudAppearanceFields';
export function HudAppearanceSetup({ show, match, locked }: { show: BroadcastShowDetail; match?: ShowMatchSlot; locked: boolean }) {
  const { query, save } = useBroadcastAppearance(show.id);
  const [value, setValue] = useState<BroadcastAppearance>(DEFAULT_APPEARANCE), [error, setError] = useState('');
  const loaded = useRef(false);
  useEffect(() => { if (query.data && !loaded.current) { loaded.current = true; setValue(query.data); } }, [query.data]);
  const disabled = locked || !query.data || save.isPending;
  const teams = value.matches?.[match?.matchId || ''] || [{}, {}];
  function updateTeam(index: number, patch: { color?: string; displayName?: string }) {
    if (!match) return;
    const next = [...teams] as [typeof teams[0], typeof teams[1]]; next[index] = { ...next[index], ...patch };
    setValue({ ...value, matches: { ...value.matches, [match.matchId]: next } }); setError(''); save.reset();
  }
  function submit() {
    const parsed = broadcastAppearanceSchema.safeParse(value);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    void save.mutateAsync(parsed.data).then(setValue).catch(failure => setError(getApiErrorMessage(failure, 'Could not save appearance.')));
  }
  return <section aria-label="HUD appearance">
    <HudSetupPreview show={show} match={match} appearance={value} />
    <details className="setup-help"><summary>HUD appearance &amp; sponsor rotation</summary>
      {query.isLoading && <p role="status">Loading saved appearance…</p>}
      {query.isError && <p role="alert">Could not load appearance. <CommandButton onClick={() => void query.refetch()}>Retry</CommandButton></p>}
      <HudAppearanceFields value={value} disabled={disabled} onChange={next => { setValue(next); setError(''); save.reset(); }} />
      {match && teams.map((team, index) => <div className="setup-team-appearance" key={index}>
        <label className="setup-field">{index === 0 ? match.teamA : match.teamB} · Broadcast display name<input disabled={disabled} maxLength={80} value={team.displayName || ''} placeholder={index === 0 ? match.teamA : match.teamB} onChange={event => updateTeam(index, { displayName: event.target.value })} /></label>
        <label className="setup-field">Team color<input type="color" disabled={disabled || !value.teamColors} value={team.color || (index === 0 ? '#ef4444' : '#3b82f6')} onChange={event => updateTeam(index, { color: event.target.value })} /></label>
      </div>)}
      <p className="setup-hint">Display names apply only to this show's selected match. Blank uses the tournament name. Tournament records stay unchanged. Save, then send the setup to Air; the selected show's identity data is checked every five seconds. This preview includes unsaved choices.</p>
      <CommandButton disabled={disabled} onClick={submit}>Save appearance</CommandButton>
      {save.isSuccess && <p role="status">Appearance saved. Send match to Air.</p>}
      {!!error && <p role="alert">{error} <CommandButton onClick={() => void query.refetch().then(result => { if (result.data) setValue(result.data); setError(''); })}>Reload saved appearance</CommandButton></p>}
    </details>
  </section>;
}
