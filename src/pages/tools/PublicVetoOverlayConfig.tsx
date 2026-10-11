import { Check, Copy } from 'lucide-react';
import { Field, InlineNotice, ToggleRow, CONTROL_CLASS } from '@/components/ui/kit';
import { CommandButton } from '@/components/management/CommandSurface';
import { usePublicVetoOverlayPreferences } from '@/hooks/usePublicVetoOverlayPreferences';

export function PublicVetoOverlayConfig({ token }: { token: string }) {
  const { preferences, update, url, copy, copyState, storageFailed } = usePublicVetoOverlayPreferences(token);
  return (
    <div className="mt-4 space-y-4" aria-label="Stream overlay configuration">
      <div>
        <h4 className="text-sm font-semibold text-white">Stream overlay</h4>
        <p id="stream-overlay-instructions" className="mt-1 text-xs leading-relaxed text-zinc-400">Add this URL as a browser source at 1920 × 1080. It shows live veto updates and expires with this room.</p>
      </div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Field label="Transition" htmlFor="stream-overlay-transition">
          <select id="stream-overlay-transition" value={preferences.transition}
            onChange={(event) => {
              const value = event.target.value;
              update({ transition: value === 'left' || value === 'right' || value === 'none' ? value : 'up' });
            }} className={`${CONTROL_CLASS} w-full border px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40`}>
            <option value="up">Up</option><option value="left">Left</option><option value="right">Right</option><option value="none">None</option>
          </select>
        </Field>
      </div>
      <ToggleRow id="stream-overlay-transparent" title="Transparent background" description="Remove the background behind the overlay."
        checked={preferences.transparent} onCheckedChange={(transparent) => update({ transparent })} />
      <div className="grid min-w-0 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3">
        <Field label="Overlay URL" htmlFor="stream-overlay-url">
          <input id="stream-overlay-url" readOnly value={url} onFocus={(event) => event.currentTarget.select()}
            className={`${CONTROL_CLASS} min-w-0 w-full border px-3 font-mono text-base sm:text-[13px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40`} />
        </Field>
        <CommandButton type="button" onClick={() => void copy()} className="w-full touch-manipulation motion-reduce:[&_*]:transition-none sm:w-auto">
          {copyState === 'copied' ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copyState === 'copied' ? 'Link copied' : 'Copy overlay link'}
        </CommandButton>
      </div>
      <span role="status" className="sr-only">{copyState === 'copied' ? 'Link copied' : ''}</span>
      {copyState === 'failed' && <InlineNotice tone="critical">Couldn't copy the link. Select the URL and copy it manually.</InlineNotice>}
      {storageFailed && <InlineNotice tone="warning">Settings apply here, but this browser couldn't remember them.</InlineNotice>}
    </div>
  );
}
