/**
 * ProposeTimeForm
 *
 * Proposing a time should be a tap or two: evening options as chips, or a
 * custom date and time. Nothing is sent until the captain presses the button,
 * and the button says exactly what will be sent.
 */

import { useMemo, useState } from 'react';
import { InlineNotice } from '@/components/ui/kit';
import { cn } from '@/lib/utils';
import { labelSuggestion, suggestMatchTimes } from '@/services/scrimTimeSuggestions';
import { toLocalInputValue } from '@/services/scrimUtils';
import { formatRoomTime } from '@/services/scrimRoomView';

interface ProposeTimeFormProps {
  onSubmit: (isoTime: string, note: string) => void;
  isPending: boolean;
  error: string;
  /** Present when the form is a counter-proposal that can be dismissed. */
  onCancel?: () => void;
  submitLabel?: string;
}

const CHIP = 'min-h-[40px] rounded-lg border px-3.5 text-[13px] font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60';

export function ProposeTimeForm({ onSubmit, isPending, error, onCancel, submitLabel = 'Propose' }: ProposeTimeFormProps) {
  const now = useMemo(() => new Date(), []);
  const suggestions = useMemo(() => suggestMatchTimes(now, 6), [now]);
  const [chosen, setChosen] = useState<Date | null>(null);
  const [custom, setCustom] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [note, setNote] = useState('');

  const customDate = custom ? new Date(custom) : null;
  const picked = showCustom && customDate && !Number.isNaN(customDate.getTime()) ? customDate : chosen;

  return (
    <div className="space-y-3">
      <div role="group" aria-label="Suggested times" className="flex flex-wrap gap-2">
        {suggestions.map((d) => {
          const selected = !showCustom && chosen?.getTime() === d.getTime();
          return (
            <button
              key={d.getTime()}
              type="button"
              aria-pressed={selected}
              onClick={() => { setShowCustom(false); setChosen(d); }}
              className={cn(CHIP, selected ? 'border-white bg-white text-black' : 'border-white/[0.14] text-white/80 hover:border-white/30 hover:text-white')}
            >
              {labelSuggestion(d, now)}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={showCustom}
          onClick={() => setShowCustom((v) => !v)}
          className={cn(CHIP, showCustom ? 'border-white bg-white text-black' : 'border-dashed border-white/[0.2] text-white/60 hover:text-white')}
        >
          Another time
        </button>
      </div>

      {showCustom && (
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-zinc-500">Date and time</span>
          <input
            type="datetime-local"
            value={custom}
            min={toLocalInputValue(new Date(now.getTime() + 10 * 60_000).toISOString())}
            onChange={(e) => setCustom(e.target.value)}
            className="h-11 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white [color-scheme:dark] focus:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:w-72"
          />
        </label>
      )}

      <label className="block space-y-1">
        <span className="text-[11px] font-medium text-zinc-500">Note (optional)</span>
        <input
          value={note}
          maxLength={200}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Can we run it on Haven and Ascent?"
          className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[13px] text-white placeholder:text-zinc-600 focus:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        />
      </label>

      {error && <InlineNotice tone="critical">{error}</InlineNotice>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!picked || isPending}
          onClick={() => picked && onSubmit(picked.toISOString(), note.trim())}
          className="min-h-[44px] rounded-lg bg-white px-5 text-[13px] font-semibold text-black transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080a] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? 'Sending…' : picked ? `${submitLabel} ${formatRoomTime(picked.toISOString())}` : 'Pick a time'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="min-h-[44px] rounded-lg border border-white/[0.14] px-4 font-mono text-[12px] uppercase tracking-[0.14em] text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
