import { useState, useContext } from 'react';
import { Field, InlineNotice } from '@/components/ui/kit';
import { CtaButton, OutlineButton } from '@/components/ui/app-buttons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateScrimListing } from '@/hooks/competitive/useScrims';
import { useCatalogRankTiers, useCatalogRegions } from '@/hooks/competitive/useCatalog';
import {
  BEST_OF_OPTIONS,
  type BestOf,
  bestOfLongLabel,
} from '@/services/scrimUtils';
import { ApiError, getApiErrorMessage } from '@/lib/apiClient';
import { GameCatalogContext } from '@/contexts/game-catalog-context';
import type { CatalogRankTier } from '@/types/competitive';

const NONE = '__none__';

const DAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
] as const;

const INPUT_CLASS =
  'h-10 w-full border border-white/10 bg-black/30 px-3 text-[13px] text-white ' +
  'placeholder:text-zinc-600 focus:outline-none focus:border-white/30 rounded-xl';

// ── Rank tier select ──────────────────────────────────────────────────────────

function RankTierSelect({
  id,
  label,
  value,
  onChange,
  tiers,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  tiers: CatalogRankTier[];
}) {
  const selected = tiers.find((t) => t.tierKey === value) ?? null;
  return (
    <Field label={label} htmlFor={id} optional>
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? '' : v)}>
        <SelectTrigger id={id} className="h-10 text-[13px] rounded-xl border-white/10 bg-black/30">
          {selected ? (
            <div className="flex items-center gap-2 min-w-0">
              {selected.iconUrl && (
                <img src={selected.iconUrl} alt="" className="h-4 w-4 object-contain shrink-0" />
              )}
              <span className="truncate">{selected.displayName}</span>
            </div>
          ) : (
            <SelectValue placeholder="Any" />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Any</SelectItem>
          {tiers.map((t) => (
            <SelectItem key={t.tierKey} value={t.tierKey}>
              <div className="flex items-center gap-2">
                {t.iconUrl && (
                  <img src={t.iconUrl} alt="" className="h-4 w-4 object-contain shrink-0" />
                )}
                <span>{t.displayName}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

// ── Form ─────────────────────────────────────────────────────────────────────

interface Props {
  teamId: string;
  gameSlug: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function WorkspaceNewListingForm({ teamId, gameSlug, onSuccess, onCancel }: Props) {
  const catalog = useContext(GameCatalogContext);
  const createMutation = useCreateScrimListing();

  const [localGameSlug, setLocalGameSlug] = useState<string>(gameSlug ?? '');

  function defaultBookingUntil(): string {
    const d = new Date();
    d.setDate(d.getDate() + 28);
    return d.toISOString().slice(0, 10);
  }

  /** Date input → inclusive end-of-day ISO, so the whole chosen day stays bookable. */
  function toEndOfDayIso(value: string): string | undefined {
    if (!value) return undefined;
    const [y, m, day] = value.split('-').map(Number);
    if (!y || !m || !day) return undefined;
    return new Date(y, m - 1, day, 23, 59, 59).toISOString();
  }

  const [scheduleType, setScheduleType] = useState<'one_off' | 'recurring'>('one_off');
  const [bestOf, setBestOf] = useState<BestOf>(3);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [timezone] = useState(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ''; }
  });
  const [regionKey, setRegionKey] = useState('');
  const [minRankKey, setMinRankKey] = useState('');
  const [maxRankKey, setMaxRankKey] = useState('');
  const rankTiersQuery = useCatalogRankTiers(localGameSlug);
  const rankTiers = rankTiersQuery.data ?? [];
  const regionsQuery = useCatalogRegions(localGameSlug);
  const regions = regionsQuery.data ?? [];
  const [scheduleUntil, setScheduleUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [apiError, setApiError] = useState('');

  function toggleDay(value: number) {
    setSelectedDays((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value],
    );
  }

  async function handleSubmit() {
    setApiError('');
    if (scheduleType === 'recurring' && !scheduleUntil) {
      setApiError('Pick the last date you want to accept bookings.');
      return;
    }
    try {
      await createMutation.mutateAsync({
        teamId,
        gameSlug: localGameSlug || undefined,
        regionKey: regionKey || undefined,
        minRankKey: minRankKey || undefined,
        maxRankKey: maxRankKey || undefined,
        preferredDays: selectedDays.length ? selectedDays : undefined,
        preferredTimeStart: timeStart || undefined,
        preferredTimeEnd: timeEnd || undefined,
        timezone: timezone || undefined,
        notes: notes.trim() || undefined,
        scheduleType,
        bestOf,
        // Recurring listings require a booking window and a slot length server-side.
        // Individual matches still run their own length; the grid is booking-only.
        scheduleUntil:
          scheduleType === 'recurring' ? toEndOfDayIso(scheduleUntil) : undefined,
        slotDurationMinutes:
          scheduleType === 'recurring' ? 90 : undefined,
      });
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setApiError('Only a team captain or manager can post a scrim listing.');
      } else if (err instanceof ApiError && err.status === 409) {
        setApiError(getApiErrorMessage(err, 'Roster is locked due to active scrims or a tournament registration.'));
      } else {
        setApiError(getApiErrorMessage(err, 'Could not post listing. Try again.'));
      }
    }
  }

  return (
    <div className="space-y-4 p-5">
      <p className="pr-6 text-[13px] font-semibold text-white/60 [font-family:var(--font-heading)]">
        New listing
      </p>

      {/* Game */}
      <Field label="Game" htmlFor="nl-game">
        <Select value={localGameSlug || '_'} onValueChange={(v) => setLocalGameSlug(v === '_' ? '' : v)}>
          <SelectTrigger id="nl-game" className="h-10 text-[13px] rounded-xl border-white/10 bg-black/30">
            <SelectValue placeholder="Select game" />
          </SelectTrigger>
          <SelectContent>
            {catalog.games.length === 0 && <SelectItem value="_">Loading…</SelectItem>}
            {catalog.games.map((g) => (
              <SelectItem key={g.slug} value={g.slug}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Schedule type */}
      <div className="space-y-2">
        <p className="text-[11px] font-medium text-white/40 uppercase tracking-wider font-mono">Schedule type</p>
        <div className="flex gap-2">
          {(['one_off', 'recurring'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setScheduleType(type);
                if (type === 'recurring' && !scheduleUntil) {
                  setScheduleUntil(defaultBookingUntil());
                }
              }}
              className={`px-3 py-1.5 text-[12px] rounded-lg border transition-colors ${
                scheduleType === type
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : 'text-white/45 border-white/[0.08] hover:text-white hover:border-white/20'
              }`}
            >
              {type === 'one_off' ? 'One-off' : 'Recurring'}
            </button>
          ))}
        </div>
      </div>

      {/* Match format — fixed by the listing, shown to every offering team */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-medium text-white/40 uppercase tracking-wider font-mono">Match format</p>
          <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-[0.12em] text-white/50">
            5v5
          </span>
        </div>
        <div className="flex gap-2">
          {BEST_OF_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={bestOf === n}
              onClick={() => setBestOf(n)}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded-lg border transition-colors ${
                bestOf === n
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : 'text-white/45 border-white/[0.08] hover:text-white hover:border-white/20'
              }`}
            >
              {`BO${n}`}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-white/30">
          {bestOfLongLabel(bestOf)} series. Teams responding to this listing play this format.
        </p>
      </div>

      {/* Preferred days */}
      <div className="space-y-2">
        <p className="text-[11px] font-medium text-white/40 uppercase tracking-wider font-mono">Preferred days</p>
        <div className="flex gap-1.5 flex-wrap">
          {DAYS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleDay(value)}
              aria-pressed={selectedDays.includes(value)}
              className={`px-3 py-1.5 text-[12px] font-mono rounded-lg border transition-colors ${
                selectedDays.includes(value)
                  ? 'bg-white/[0.12] text-white border-white/[0.25]'
                  : 'text-white/45 border-white/[0.08] hover:text-white hover:border-white/[0.18]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Time window */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Available from" htmlFor="nl-time-start">
          <input
            id="nl-time-start"
            type="time"
            value={timeStart}
            onChange={(e) => setTimeStart(e.target.value)}
            className={`${INPUT_CLASS} [color-scheme:dark]`}
          />
        </Field>
        <Field label="Until" htmlFor="nl-time-end">
          <input
            id="nl-time-end"
            type="time"
            value={timeEnd}
            onChange={(e) => setTimeEnd(e.target.value)}
            className={`${INPUT_CLASS} [color-scheme:dark]`}
          />
        </Field>
      </div>

      {/* Mode is not configured — a scrim is 5v5 by definition. */}

      {/* Region */}
      <Field label="Region" htmlFor="nl-region">
        <Select value={regionKey || NONE} onValueChange={(v) => setRegionKey(v === NONE ? '' : v)}>
          <SelectTrigger id="nl-region" className="h-10 text-[13px] rounded-xl border-white/10 bg-black/30">
            <SelectValue placeholder="No preference" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No preference</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r.regionKey} value={r.regionKey}>
                {r.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Rank range — Radix Select with tier icons */}
      {rankTiers.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <RankTierSelect id="nl-min-rank" label="Min rank" value={minRankKey} onChange={setMinRankKey} tiers={rankTiers} />
          <RankTierSelect id="nl-max-rank" label="Max rank" value={maxRankKey} onChange={setMaxRankKey} tiers={rankTiers} />
        </div>
      )}

      {/* Recurring fields */}
      {scheduleType === 'recurring' && (
        <Field label="Accept bookings until" htmlFor="nl-until">
          <input
            id="nl-until"
            type="date"
            required
            value={scheduleUntil}
            onChange={(e) => setScheduleUntil(e.target.value)}
            className={`${INPUT_CLASS} [color-scheme:dark]`}
          />
          <p className="text-[11px] text-white/30 mt-1.5">
            Your listing stays open for new slots through this date (defaults four weeks out).
          </p>
          {(selectedDays.length === 0 || !timeStart || !timeEnd) && (
            <p className="text-[11px] text-amber-300/70 mt-1.5">
              Add at least one day and a time window so bookable slots can be generated.
            </p>
          )}
        </Field>
      )}

      {/* Notes */}
      <Field label="Message to teams" htmlFor="nl-notes" optional>
        <textarea
          id="nl-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 500))}
          placeholder="Preferred playstyle, requirements…"
          rows={2}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-none"
        />
      </Field>

      {apiError && <InlineNotice tone="critical">{apiError}</InlineNotice>}

      <div className="flex justify-end gap-2 pt-1">
        <OutlineButton
          onClick={onCancel}
          className="rounded-xl px-4 text-[13px]"
        >
          Cancel
        </OutlineButton>
        <CtaButton
          onClick={handleSubmit}
          disabled={createMutation.isPending || !localGameSlug}
          className="rounded-xl px-6 text-[13px] font-semibold"
        >
          {createMutation.isPending ? 'Posting…' : 'Post listing'}
        </CtaButton>
      </div>
    </div>
  );
}
