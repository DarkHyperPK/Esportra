import { useState } from 'react';
import { startSquadUpSchema, type StartSquadUpInput } from '@/schemas/squadUp';

interface SquadUpStartPanelProps {
  onStart: (input: StartSquadUpInput) => void;
  pending: boolean;
  error?: string;
  notice?: string;
}

export function SquadUpStartPanel({ onStart, pending, error, notice }: SquadUpStartPanelProps) {
  const [micOn, setMicOn] = useState(true);
  const [slotsNeeded, setSlotsNeeded] = useState(1);
  const [formError, setFormError] = useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = startSquadUpSchema.safeParse({ micOn, slotsNeeded });
    if (!parsed.success) { setFormError('Choose between 1 and 4 players to find.'); return; }
    setFormError('');
    onStart(parsed.data);
  }

  return (
    <form className="lfg-panel squad-panel-body" onSubmit={submit}>
      <div>
        <h2>Squad up now</h2>
        <p className="squad-muted">
          Show up for a few minutes, swipe on ranked players near your rank in your region, and find teammates for a game right now.
          You drop out automatically if you leave this page open but inactive for a few minutes.
        </p>
      </div>
      {notice && <p className="squad-muted" role="status">{notice}</p>}
      <div className="squad-mic-row">
        <label htmlFor="squad-mic">I can talk on mic</label>
        <input id="squad-mic" type="checkbox" checked={micOn} onChange={(event) => setMicOn(event.target.checked)} />
      </div>
      <fieldset className="lfg-field" style={{ border: 0, padding: 0 }}>
        <legend>Players I&apos;m looking for</legend>
        <div className="squad-slots">
          {[1, 2, 3, 4].map((count) => (
            <button key={count} type="button" className="lfg-button" aria-pressed={slotsNeeded === count} onClick={() => setSlotsNeeded(count)}>
              {count}
            </button>
          ))}
        </div>
      </fieldset>
      {(formError || error) && <p className="squad-error" role="alert">{formError || error}</p>}
      <button type="submit" className="lfg-button lfg-button-primary" disabled={pending}>
        {pending ? 'Starting…' : 'Start Squad Up'}
      </button>
    </form>
  );
}
