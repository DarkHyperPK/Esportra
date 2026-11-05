import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLfgReducedMotion } from '@/hooks/competitive/useLfgReducedMotion';
import { countryName } from '@/lib/countryAreas';
import { DEMO_LOBBY, DEMO_PLAYERS } from '../demo/demoData';

interface FeedEvent { id: number; kind: 'looking' | 'match' | 'lobby'; text: string }

const SCRIPT: Omit<FeedEvent, 'id'>[] = [
  ...DEMO_PLAYERS.slice(0, 4).map((p) => ({ kind: 'looking' as const, text: `${p.name} is looking · ${p.tierName} · ${countryName(p.countryCode ?? '')}` })),
  { kind: 'match', text: 'Noor and Ali squadded up' },
  { kind: 'lobby', text: `“${DEMO_LOBBY.title}” 4/5` },
  ...DEMO_PLAYERS.slice(4).map((p) => ({ kind: 'looking' as const, text: `${p.name} is looking · ${p.tierName} · ${countryName(p.countryCode ?? '')}` })),
  { kind: 'lobby', text: `“${DEMO_LOBBY.title}” is full. Queueing` },
  { kind: 'match', text: 'Sana and Rami squadded up' },
];

const VISIBLE = 5;
const EVERY_MS = 2400;

/** A broadcast-style event log beside the hero. Scripted from the sample players and labelled as such. */
export function SignalFeed() {
  const reduced = useLfgReducedMotion();
  const [count, setCount] = useState(VISIBLE);
  useEffect(() => {
    if (reduced) return undefined;
    const timer = window.setInterval(() => setCount((value) => value + 1), EVERY_MS);
    return () => window.clearInterval(timer);
  }, [reduced]);
  const events: FeedEvent[] = Array.from({ length: VISIBLE }, (_, i) => {
    const id = count - i;
    return { id, ...SCRIPT[((id % SCRIPT.length) + SCRIPT.length) % SCRIPT.length] };
  });

  return (
    <aside className="su-feed" aria-label="Sample activity">
      <p className="su-caption"><span className="su-dot" aria-hidden /> Signal · sample</p>
      <ol>
        <AnimatePresence initial={false}>
          {events.map((event, index) => (
            <motion.li key={event.id} layout={!reduced} className={`su-feed-${event.kind}`}
              initial={reduced ? false : { opacity: 0, x: -24 }} animate={{ opacity: 1 - index * 0.17, x: 0 }} exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
              <span className="su-feed-mark" aria-hidden />
              {event.text}
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </aside>
  );
}
