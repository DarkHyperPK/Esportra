import { useState, useContext } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Field, InlineNotice } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateScrimListing } from '@/hooks/competitive/useScrims';
import { getApiErrorMessage } from '@/lib/apiClient';
import { GameCatalogContext } from '@/contexts/game-catalog-context';

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
  'h-9 w-full border border-white/10 bg-black/30 px-3 text-[13px] text-white ' +
  'placeholder:text-zinc-600 focus:outline-none focus:border-white/30';

const TOGGLE_BASE = 'px-4 py-2 text-[13px] border transition-colors';
const TOGGLE_ACTIVE = 'bg-white/[0.10] text-white border-white/[0.20]';
const TOGGLE_IDLE = 'text-white/55 border-white/[0.08] hover:text-white hover:border-white/[0.15]';

interface Props {
  teamId: string;
  gameSlug: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function WorkspaceNewListingForm({ teamId, gameSlug, onSuccess, onCancel }: Props) {
  const catalog = useContext(GameCatalogContext);
  const prefersReducedMotion = useReducedMotion();
  const createMutation = useCreateScrimListing();

  const [localGameSlug, setLocalGameSlug] = useState<string>(gameSlug ?? '');
  const game = catalog.games.find((g) => g.slug === localGameSlug) ?? null;
  const gameModes = game?.modes ?? [];

  const [scheduleType, setScheduleType] = useState<'one_off' | 'recurring'>('one_off');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [timezone] = useState(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ''; }
  });
  const [modeKey, setModeKey] = useState('');
  const [regionKey, setRegionKey] = useState('');
  const [scheduleUntil, setScheduleUntil] = useState('');
  const [slotDurationMinutes, setSlotDurationMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [apiError, setApiError] = useState('');

  function toggleDay(value: number) {
    setSelectedDays((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value],
    );
  }

  async function handleSubmit() {
    setApiError('');
    try {
      await createMutation.mutateAsync({
        teamId,
        gameSlug: localGameSlug || undefined,
        modeKey: modeKey || undefined,
        regionKey: regionKey || undefined,
        preferredDays: selectedDays.length ? selectedDays : undefined,
        preferredTimeStart: timeStart || undefined,
        preferredTimeEnd: timeEnd || undefined,
        timezone: timezone || undefined,
        notes: notes.trim() || undefined,
        scheduleType,
        scheduleUntil: scheduleType === 'recurring' ? scheduleUntil || undefined : undefined,
        slotDurationMinutes:
          scheduleType === 'recurring'
            ? parseInt(slotDurationMinutes, 10) || undefined
            : undefined,
      });
      onSuccess();
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Could not post listing. Try again.'));
    }
  }

  const arriveProps = prefersReducedMotion
    ? {}
    : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0, transition: { duration: 0.18 } } };

  return (
    <motion.div {...arriveProps} className="border border-white/10 bg-white/[0.03] p-4 space-y-4">
      <p className="text-[11px] font-medium text-white/35">
        Post a listing
      </p>

      {/* Game selector */}
      <Field label="Game" htmlFor="nl-game">
        <Select value={localGameSlug || '_'} onValueChange={(v) => { setLocalGameSlug(v === '_' ? '' : v); setModeKey(''); }}>
          <SelectTrigger id="nl-game" className="h-9 text-[13px] rounded-none border-white/10 bg-black/30">
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

      {/* Schedule type toggle */}
      <div className="space-y-1.5">
        <p className="text-[13px] font-medium text-zinc-200">Schedule type</p>
        <div className="flex gap-2">
          {(['one_off', 'recurring'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setScheduleType(type)}
              className={`${TOGGLE_BASE} ${scheduleType === type ? TOGGLE_ACTIVE : TOGGLE_IDLE}`}
            >
              {type === 'one_off' ? 'One-off' : 'Recurring'}
            </button>
          ))}
        </div>
      </div>

      {/* Preferred days */}
      <div className="space-y-1.5">
        <p className="text-[13px] font-medium text-zinc-200">Preferred days</p>
        <div className="flex gap-1.5 flex-wrap">
          {DAYS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleDay(value)}
              aria-pressed={selectedDays.includes(value)}
              className={`px-3 py-1 text-[12px] font-mono border transition-colors ${
                selectedDays.includes(value) ? TOGGLE_ACTIVE : TOGGLE_IDLE
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Available window */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Available window" htmlFor="nl-time-start">
          <input
            id="nl-time-start"
            type="time"
            value={timeStart}
            onChange={(e) => setTimeStart(e.target.value)}
            className={`${INPUT_CLASS} [color-scheme:dark]`}
          />
        </Field>
        <Field label="To" htmlFor="nl-time-end">
          <input
            id="nl-time-end"
            type="time"
            value={timeEnd}
            onChange={(e) => setTimeEnd(e.target.value)}
            className={`${INPUT_CLASS} [color-scheme:dark]`}
          />
        </Field>
      </div>

      {/* Mode */}
      <Field label="Mode" htmlFor="nl-mode" optional>
        {gameModes.length > 0 ? (
          <select
            id="nl-mode"
            value={modeKey}
            onChange={(e) => setModeKey(e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">Any mode</option>
            {gameModes.map((m) => (
              <option key={m.key ?? m.value} value={m.key ?? m.value}>
                {m.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="nl-mode"
            value={modeKey}
            onChange={(e) => setModeKey(e.target.value)}
            placeholder="e.g. Competitive"
            className={INPUT_CLASS}
          />
        )}
      </Field>

      {/* Region */}
      <Field label="Region" htmlFor="nl-region" optional>
        <input
          id="nl-region"
          value={regionKey}
          onChange={(e) => setRegionKey(e.target.value)}
          placeholder="e.g. NA, EU"
          className={INPUT_CLASS}
        />
      </Field>

      {/* Recurring fields */}
      {scheduleType === 'recurring' && (
        <>
          <Field label="Accept bookings until" htmlFor="nl-until">
            <input
              id="nl-until"
              type="date"
              value={scheduleUntil}
              onChange={(e) => setScheduleUntil(e.target.value)}
              className={`${INPUT_CLASS} [color-scheme:dark]`}
            />
            <p className="text-[11px] text-white/30 mt-1">
              Your listing stays open for new slots until this date.
            </p>
          </Field>
          <Field label="Session duration (minutes)" htmlFor="nl-slot-dur" optional>
            <input
              id="nl-slot-dur"
              type="number"
              min={15}
              max={360}
              value={slotDurationMinutes}
              onChange={(e) => setSlotDurationMinutes(e.target.value)}
              placeholder="e.g. 90"
              className={INPUT_CLASS}
            />
            <p className="text-[11px] text-white/30 mt-1">
              How long each scrim session lasts. Slots are generated from your availability.
            </p>
          </Field>
        </>
      )}

      {/* Message to teams */}
      <Field label="Message to teams" htmlFor="nl-notes" optional>
        <textarea
          id="nl-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 500))}
          placeholder="Preferred playstyle, requirements…"
          rows={2}
          className="w-full border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-none"
        />
      </Field>

      {apiError && <InlineNotice tone="critical">{apiError}</InlineNotice>}

      <div className="flex justify-end gap-2 pt-1">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="text-[13px] text-white/55 hover:text-white rounded-none border border-white/[0.08]"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending || !localGameSlug}
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-none px-5 text-[13px]"
        >
          {createMutation.isPending ? 'Posting…' : 'Post listing'}
        </Button>
      </div>
    </motion.div>
  );
}
