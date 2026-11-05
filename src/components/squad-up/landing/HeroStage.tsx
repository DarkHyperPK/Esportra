import { useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLfgReducedMotion } from '@/hooks/competitive/useLfgReducedMotion';
import type { SquadUpPublicStats } from '@/hooks/competitive/useSquadUpPublicStats';
import { DEMO_PLAYERS } from '../demo/demoData';
import { demoReducer, initialDemoState } from '../demo/demoState';
import { DemoDuo } from '../demo/DemoDuo';
import { SignalRadar } from './SignalRadar';
import { SignalFeed } from './SignalFeed';

const WORDS = ['duo', 'trio', 'five-stack'];
const SAMPLE_AREAS = [{ id: 'south-asia', label: 'South Asia' }, { id: 'middle-east', label: 'Middle East' }] as const;
type SampleArea = (typeof SAMPLE_AREAS)[number]['id'];

function KineticWord() {
  const reduced = useLfgReducedMotion();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduced) return undefined;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % WORDS.length), 2200);
    return () => window.clearInterval(timer);
  }, [reduced]);
  return (
    <span className="su-kinetic">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={WORDS[index]} initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '-100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}>{WORDS[index]}</motion.span>
      </AnimatePresence>
    </span>
  );
}

function Scorebug({ stats }: { stats?: SquadUpPublicStats }) {
  const cells = stats
    ? [['Looking', stats.playersLive], ['Lobbies', stats.openLobbies], ['Matches today', stats.matchesToday]] as const
    : null;
  return (
    <div className="su-bug" role="group" aria-label="Squad Up right now">
      <span className="su-bug-live"><span className="su-dot" aria-hidden /> Live</span>
      <span className="su-bug-name">Squad Up</span>
      {cells ? cells.map(([label, value]) => <span key={label} className="su-bug-cell"><b>{value}</b> {label}</span>)
        : <span className="su-bug-cell">Valorant · every server</span>}
    </div>
  );
}

/**
 * The hero is the product: a signal scope with the sample deck in its centre. Visitors swipe, tap blips on the
 * scope to pull a player forward, and switch the sample area to see that players only meet their own area.
 */
export function HeroStage({ stats, action }: { stats?: SquadUpPublicStats; action: ReactNode }) {
  const [area, setArea] = useState<SampleArea>('south-asia');
  const players = useMemo(() => DEMO_PLAYERS.filter((p) => p.area === area), [area]);
  const [state, dispatch] = useReducer(demoReducer, players, initialDemoState);

  function tune(next: SampleArea) {
    setArea(next);
    dispatch({ type: 'reset', players: DEMO_PLAYERS.filter((p) => p.area === next) });
  }

  return (
    <section className="su-stage" aria-labelledby="su-stage-title">
      <div className="su-stage-glow" aria-hidden />
      <header className="su-stage-head">
        <Scorebug stats={stats} />
        <h1 id="su-stage-title">Find your <KineticWord /> before Discord replies.</h1>
        <p className="su-stage-lead">Valorant players who are online right now, on your server, where you live. Swipe for a duo or fill a lobby. Idle players drop out, so everyone here is ready to queue.</p>
        <div className="su-stage-actions">{action}<a className="su-link" href="#how-it-works">See how it works</a></div>
      </header>

      <div className="su-stage-core">
        <SignalFeed />
        <div className="su-stage-deck">
          <div className="su-tune" role="radiogroup" aria-label="Sample area">
            <span className="su-caption">Try it · I live in</span>
            {SAMPLE_AREAS.map((item) => (
              <button key={item.id} type="button" role="radio" aria-checked={area === item.id} onClick={() => tune(item.id)}>{item.label}</button>
            ))}
          </div>
          <div className="su-stage-scope">
            <SignalRadar players={state.deck} topId={state.deck[0]?.id} onPick={(id) => dispatch({ type: 'pick', id })} />
            <DemoDuo state={state} dispatch={dispatch} players={players} />
          </div>
          <p className="su-stage-hint">Sample players. Drag the card, tap a blip, or use ← and →. Nothing here is sent anywhere.</p>
        </div>
      </div>
    </section>
  );
}
