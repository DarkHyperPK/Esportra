import { useState } from 'react';
import { startQueueSchema, type StartQueueInput } from '@/schemas/lfgQueue';

interface QueueStartPanelProps {
  onStart: (input: StartQueueInput) => void;
  pending: boolean;
  error?: string;
  notice?: string;
}

export function QueueStartPanel({ onStart, pending, error, notice }: QueueStartPanelProps) {
  const [micOn, setMicOn] = useState(true);
  const [slotsNeeded, setSlotsNeeded] = useState(1);
  const [formError, setFormError] = useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = startQueueSchema.safeParse({ micOn, slotsNeeded });
    if (!parsed.success) { setFormError('Choose between 1 and 4 players to find.'); return; }
    setFormError('');
    onStart(parsed.data);
  }

  return (
    <form className="lfg-panel queue-panel-body" onSubmit={submit}>
      <div>
        <h2>Queue now</h2>
        <p className="queue-muted">
          Show up for a few minutes, swipe on ranked players near your rank in your region, and match for a game right now.
          You leave the queue automatically if you stop heartbeating for three minutes.
        </p>
      </div>
      {notice && <p className="queue-muted" role="status">{notice}</p>}
      <div className="queue-mic-row">
        <label htmlFor="queue-mic">I can talk on mic</label>
        <input id="queue-mic" type="checkbox" checked={micOn} onChange={(event) => setMicOn(event.target.checked)} />
      </div>
      <fieldset className="lfg-field" style={{ border: 0, padding: 0 }}>
        <legend>Players I&apos;m looking for</legend>
        <div className="queue-slots">
          {[1, 2, 3, 4].map((count) => (
            <button key={count} type="button" className="lfg-button" aria-pressed={slotsNeeded === count} onClick={() => setSlotsNeeded(count)}>
              {count}
            </button>
          ))}
        </div>
      </fieldset>
      {(formError || error) && <p className="queue-error" role="alert">{formError || error}</p>}
      <button type="submit" className="lfg-button lfg-button-primary" disabled={pending}>
        {pending ? 'Joining…' : 'Join the queue'}
      </button>
    </form>
  );
}
