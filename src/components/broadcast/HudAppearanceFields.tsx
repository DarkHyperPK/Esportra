import type { BroadcastAppearance } from '@/schemas/broadcastAppearanceSchema';
export function HudAppearanceFields({ value, disabled, onChange }: { value: BroadcastAppearance; disabled: boolean; onChange: (value: BroadcastAppearance) => void }) {
  return <div className="setup-appearance-fields">
    <label className="setup-field">HUD pack<select aria-label="HUD pack" disabled={disabled} value={value.pack} onChange={() => onChange({ ...value, pack: 'esportra' })}><option value="esportra">Esportra · Installed Valorant screens</option></select></label>
    <label className="setup-field">Banner theme<select aria-label="Banner theme" disabled={disabled} value={value.bannerTheme} onChange={event => onChange({ ...value, bannerTheme: event.target.value as BroadcastAppearance['bannerTheme'] })}>
      <option value="broadcast">Broadcast</option><option value="compact">Compact</option><option value="monument">Monument</option><option value="impact">Impact</option>
    </select></label>
    <div className="setup-appearance-toggles">
    <label><input type="checkbox" disabled={disabled} checked={value.teamColors} onChange={event => onChange({ ...value, teamColors: event.target.checked })} /> Use team colors</label>
    <label><input type="checkbox" disabled={disabled} checked={value.eventBug} onChange={event => onChange({ ...value, eventBug: event.target.checked })} /> Show tournament name in event bug</label>
    <label><input type="checkbox" disabled={disabled} checked={value.sponsorRotation} onChange={event => onChange({ ...value, sponsorRotation: event.target.checked })} /> Rotate active sponsor logos</label>
    </div>
    <label className="setup-field">Seconds per sponsor<input type="number" min={5} max={120} value={value.sponsorSeconds} disabled={disabled || !value.sponsorRotation} onChange={event => onChange({ ...value, sponsorSeconds: Number(event.target.value) })} /></label>
    <label className="setup-field">Stinger transition for new screens<input disabled={disabled} maxLength={256} value={value.stingerName || ''} placeholder="Optional · Exact transition name from OBS" onChange={event => onChange({ ...value, stingerName: event.target.value || null })} /></label>
    <p className="setup-hint">When rotation is off, the first active sponsor stays visible. Save before importing screens or a Bo1/Bo3 flow to apply this existing OBS Stinger. Existing items retain their transition; change those in advanced screen settings. Air checks availability before a Take; a missing Stinger keeps Program in place.</p>
  </div>;
}
