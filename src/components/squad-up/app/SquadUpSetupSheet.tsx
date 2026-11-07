import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { CommandButton } from '@/components/management/CommandSurface';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { NOTE_MAX, type SquadUpMode } from '@/schemas/squadUp';
import { squadUpSetupSchema, type SquadUpSetup } from '@/hooks/competitive/useSquadUpFilters';
import type { AreaId } from '@/lib/countryAreas';
import { AreaPicker } from './AreaPicker';

export type SetupValues = SquadUpSetup;

interface SquadUpSetupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: Partial<SquadUpSetup>;
  pending: boolean;
  rankSyncing?: boolean;
  error?: string;
  submitLabel: string;
  onSubmit: (values: SquadUpSetup) => void;
}

/**
 * The quick setup: what you want to play, where you live, one optional line for your card, how many you need,
 * mic. Everything is pre-filled from last time, so going live is usually a single tap.
 */
export function SquadUpSetupSheet({ open, onOpenChange, initial, pending, rankSyncing, error, submitLabel, onSubmit }: SquadUpSetupSheetProps) {
  const wide = useMediaQuery('(min-width: 768px)');
  const [mode, setMode] = useState<SquadUpMode>(initial.mode ?? 'competitive');
  const [areas, setAreas] = useState<AreaId[]>(initial.areas ?? []);
  const [note, setNote] = useState(initial.note ?? '');
  const [slots, setSlots] = useState(initial.slotsNeeded ?? 1);
  const [micOn, setMicOn] = useState(initial.micOn ?? true);
  const [formError, setFormError] = useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = squadUpSetupSchema.safeParse({ game: 'valorant', mode, areas, note, slotsNeeded: slots, micOn, minTier: null, maxTier: null });
    if (!parsed.success) { setFormError(areas.length ? parsed.error.issues[0]?.message ?? 'Check your choices.' : 'Pick at least one region.'); return; }
    setFormError('');
    onSubmit(parsed.data);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={wide ? 'right' : 'bottom'} className="su-sheet w-full overflow-y-auto sm:max-w-md">
        <p className="su-caption">Valorant · more games soon</p>
        <SheetTitle className="su-sheet-title">Go live</SheetTitle>
        <SheetDescription className="su-hint">Players on your Valorant server who live where you do, looking right now.</SheetDescription>
        <form className="su-setup" onSubmit={submit}>
          <div className="su-mode" role="radiogroup" aria-label="What you want to play">
            {(['competitive', 'unrated'] as const).map((item) => (
              <button key={item} type="button" role="radio" aria-checked={mode === item} onClick={() => setMode(item)}>
                <strong>{item === 'competitive' ? 'Competitive' : 'Unrated'}</strong>
                <span>{item === 'competitive' ? 'Near your rank' : 'Any rank, unranked welcome'}</span>
              </button>
            ))}
          </div>

          <fieldset><legend>Where do you play?</legend><AreaPicker value={areas} onChange={setAreas} /></fieldset>

          <label className="su-note">
            <span>Your line <small>optional · shown on your card</small></span>
            <input value={note} maxLength={NOTE_MAX} onChange={(event) => setNote(event.target.value)} placeholder="I smoke, you entry. Evenings PKT." />
            <small className="su-count-text" aria-live="polite">{note.length}/{NOTE_MAX}</small>
          </label>

          <div className="su-setup-row">
            <div className="su-choice" role="radiogroup" aria-label="Players you need">
              <span className="su-caption">Need</span>
              {[1, 2, 3, 4].map((count) => (
                <button key={count} type="button" role="radio" aria-checked={slots === count} aria-label={`${count} ${count === 1 ? 'player' : 'players'}`} onClick={() => setSlots(count)}>{count}</button>
              ))}
            </div>
            <button type="button" className="su-mic" aria-pressed={micOn} onClick={() => setMicOn(!micOn)}>
              {micOn ? <Mic size={15} aria-hidden /> : <MicOff size={15} aria-hidden />} {micOn ? 'Mic on' : 'No mic'}
            </button>
          </div>

          {rankSyncing
            ? <p className="su-syncing" role="status" aria-live="polite">Syncing your rank<span className="su-syncing-dots" aria-hidden="true"><span /><span /><span /></span></p>
            : (formError || error) && <p className="su-error" role="alert">{formError || error}</p>}
          <CommandButton type="submit" variant="primary" size="lg" slide disabled={pending || rankSyncing}>
            {pending ? 'Going live…' : rankSyncing ? 'Syncing rank…' : submitLabel}
          </CommandButton>
        </form>
      </SheetContent>
    </Sheet>
  );
}
