import { useState } from 'react';
import { DemoDuo } from './DemoDuo';
import { DemoLobby } from './DemoLobby';
import './demo.css';

type Tab = 'duo' | 'lobby';

/** The interactive "monitor" on the public page. Everything here runs on sample players in the browser. */
export function SquadUpDemo() {
  const [tab, setTab] = useState<Tab>('duo');
  return (
    <section className="su-monitor" aria-label="Try Squad Up with sample players">
      <div className="su-monitor-bar">
        <div className="su-tabs" role="tablist" aria-label="Demo mode">
          <button type="button" role="tab" id="su-demo-tab-duo" aria-selected={tab === 'duo'} aria-controls="su-demo-panel" onClick={() => setTab('duo')}>Duo</button>
          <button type="button" role="tab" id="su-demo-tab-lobby" aria-selected={tab === 'lobby'} aria-controls="su-demo-panel" onClick={() => setTab('lobby')}>Lobby</button>
        </div>
        <span className="su-caption">Sample players</span>
      </div>
      <div id="su-demo-panel" role="tabpanel" aria-labelledby={`su-demo-tab-${tab}`} className="su-monitor-body">
        {tab === 'duo' ? <DemoDuo /> : <DemoLobby />}
      </div>
      <p className="su-monitor-hint">
        {tab === 'duo' ? 'Drag a card, use the buttons, or press ← and →. Nothing here is real: no account needed.' : 'A lobby fills in real time as the host accepts players.'}
      </p>
    </section>
  );
}
