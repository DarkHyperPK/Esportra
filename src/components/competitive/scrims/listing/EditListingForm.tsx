import { useState } from 'react';
import { InlineNotice, Field } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { useUpdateScrimListing } from '@/hooks/competitive/useScrims';
import { getApiErrorMessage } from '@/lib/apiClient';
import { BEST_OF_OPTIONS, type BestOf, normalizeBestOf } from '@/services/scrimUtils';
import { SCRIM_EYEBROW } from '../scrimCardStyles';
import type { ScrimListing } from '@/types/competitive';

export function EditListingForm({ listing, onClose }: { listing: ScrimListing; onClose: () => void }) {
  const updateMutation = useUpdateScrimListing(listing.id);
  const [region, setRegion] = useState(listing.regionKey ?? '');
  const [bestOf, setBestOf] = useState<BestOf>(normalizeBestOf(listing.bestOf));
  const [notes, setNotes] = useState(listing.notes ?? '');
  const [apiError, setApiError] = useState('');

  async function handleSubmit() {
    setApiError('');
    try {
      await updateMutation.mutateAsync({
        regionKey: region.trim() || undefined,
        bestOf,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Could not update listing. Try again.'));
    }
  }

  return (
    <div className="space-y-3 rounded-b-2xl border-t border-white/[0.06] bg-black/40 p-4">
      <p className={SCRIM_EYEBROW}>Edit listing</p>
      <Field label="Region" htmlFor={`elr-${listing.id}`} optional>
        <input
          id={`elr-${listing.id}`}
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="e.g. EU, NA"
          className="h-9 w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
        />
      </Field>
      <div className="space-y-2">
        <div className={SCRIM_EYEBROW}>Series format</div>
        <div className="flex gap-2">
          {BEST_OF_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={bestOf === n}
              onClick={() => setBestOf(n)}
              className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                bestOf === n
                  ? 'border-rose-500/30 bg-rose-500/15 text-rose-400'
                  : 'border-white/[0.08] text-white/45 hover:border-white/20 hover:text-white'
              }`}
            >
              BO{n}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-white/30">
          Changing this only affects future offers; accepted scrims keep their format.
        </p>
      </div>
      <Field label="Message to teams" htmlFor={`eln-${listing.id}`} optional>
        <textarea
          id={`eln-${listing.id}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 500))}
          rows={2}
          className="w-full resize-none rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
        />
      </Field>
      {apiError && <InlineNotice tone="critical">{apiError}</InlineNotice>}
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          onClick={onClose}
          className="rounded-lg border border-white/[0.08] text-[13px] text-white/50 hover:text-white"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={updateMutation.isPending}
          className="rounded-lg bg-rose-500 px-4 text-[13px] text-white hover:bg-rose-600"
        >
          {updateMutation.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

// ─── Slot expansion ───────────────────────────────────────────────────────────
