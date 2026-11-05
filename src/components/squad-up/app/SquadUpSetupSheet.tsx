import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { CommandButton } from '@/components/management/CommandSurface';
import { squadUpFiltersSchema, type SquadUpFilters, type SquadUpMode } from '@/schemas/squadUp';
import { CountryPicker } from './CountryPicker';
import { RankRange } from './RankRange';

export interface SetupValues extends SquadUpFilters { micOn: boolean; slotsNeeded: number }

interface SquadUpSetupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownCountry?: string | null;
  initial?: Partial<SetupValues>;
  pending: boolean;
  error?: string;
  submitLabel: string;
  onSubmit: (values: SetupValues) => void;
}

/** Everything Squad Up needs before you go live: game, mode, countries, rank range, mic and how many you need. */
export function SquadUpSetupSheet({ open, onOpenChange, ownCountry, initial, pending, error, submitLabel, onSubmit }: SquadUpSetupSheetProps) {
  const [mode, setMode] = useState<SquadUpMode>(initial?.mode ?? 'competitive');
  const [countries, setCountries] = useState<string[]>(initial?.wantedCountries ?? (ownCountry ? [ownCountry] : []));
  const [range, setRange] = useState({ minTier: initial?.minTier ?? null, maxTier: initial?.maxTier ?? null });
  const [micOn, setMicOn] = useState(initial?.micOn ?? true);
  const [slots, setSlots] = useState(initial?.slotsNeeded ?? 1);
  const [formError, setFormError] = useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = squadUpFiltersSchema.safeParse({ game: 'valorant', mode, wantedCountries: countries, ...(mode === 'competitive' ? range : {}) });
    if (!parsed.success) { setFormError(parsed.error.issues[0]?.message ?? 'Check your choices.'); return; }
    setFormError('');
    onSubmit({ ...parsed.data, micOn, slotsNeeded: slots });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="su-sheet w-full overflow-y-auto sm:max-w-lg">
        <SheetTitle className="su-sheet-title">Set up Squad Up</SheetTitle>
        <SheetDescription className="su-hint">You only see players who also want you: same mode, countries you both picked, and ranks you both accept.</SheetDescription>
        <form className="su-setup" onSubmit={submit}>
          <fieldset><legend>Game</legend>
            <div className="su-choice" role="radiogroup" aria-label="Game">
              <button type="button" role="radio" aria-checked>Valorant</button>
              <button type="button" disabled aria-disabled><Lock size={12} aria-hidden /> More games coming</button>
            </div>
          </fieldset>
          <fieldset><legend>What do you want to play?</legend>
            <div className="su-choice" role="radiogroup" aria-label="Mode">
              {(['competitive', 'unrated'] as const).map((item) => (
                <button key={item} type="button" role="radio" aria-checked={mode === item} onClick={() => setMode(item)}>
                  {item === 'competitive' ? 'Competitive (ranked)' : 'Unrated'}
                </button>
              ))}
            </div>
            <p className="su-hint">{mode === 'competitive' ? 'Needs a current rank. You see players near it, or set a range below.' : 'Rank doesn\'t matter, and unranked players can join.'}</p>
          </fieldset>
          <fieldset><legend>Who do you want to play with?</legend>
            <CountryPicker value={countries} onChange={setCountries} ownCountry={ownCountry} />
            <p className="su-hint">You also only see players on your Valorant server region (for example AP or EU), because you can't party across regions.</p>
          </fieldset>
          {mode === 'competitive' && (
            <fieldset><legend>Rank range</legend><RankRange minTier={range.minTier} maxTier={range.maxTier} onChange={setRange} /></fieldset>
          )}
          <fieldset><legend>Players you need</legend>
            <div className="su-choice" role="radiogroup" aria-label="Players you need">
              {[1, 2, 3, 4].map((count) => (
                <button key={count} type="button" role="radio" aria-checked={slots === count} onClick={() => setSlots(count)}>{count}</button>
              ))}
            </div>
          </fieldset>
          <label className="su-check"><input type="checkbox" checked={micOn} onChange={(event) => setMicOn(event.target.checked)} /> I can talk on mic</label>
          {(formError || error) && <p className="su-error" role="alert">{formError || error}</p>}
          <CommandButton type="submit" variant="primary" size="lg" slide disabled={pending}>{pending ? 'Going live…' : submitLabel}</CommandButton>
        </form>
      </SheetContent>
    </Sheet>
  );
}
