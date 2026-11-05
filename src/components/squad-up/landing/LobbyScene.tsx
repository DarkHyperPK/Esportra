import { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion';
import { useLfgReducedMotion } from '@/hooks/competitive/useLfgReducedMotion';
import { DEMO_LOBBY } from '../demo/demoData';
import { DemoLobby } from '../demo/DemoLobby';

const PEOPLE = [DEMO_LOBBY.host, ...DEMO_LOBBY.members, { name: 'You', avatarUrl: null, role: 'Controller' }, DEMO_LOBBY.lastToJoin];

const BEATS = [
  { title: 'Open a lobby', body: 'Say what you are missing: two slots, a controller and a sentinel.' },
  { title: 'Players ask to join', body: 'Only players on your server, from where you live, near your rank can see it.' },
  { title: 'You pick who gets in', body: 'Accept or decline each request. Every accept lands in real time.' },
  { title: 'Full. Group chat opens.', body: 'All five get the chat at once. Share the party code and queue.' },
];

/**
 * A lobby filling as you scroll: five slots light up one by one while the steps change beside them. Below it,
 * the playable sample lobby. Reduced motion shows the full lobby and all steps.
 */
export function LobbyScene() {
  const reduced = useLfgReducedMotion();
  const scene = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: scene, offset: ['start start', 'end end'] });
  const [filled, setFilled] = useState(reduced ? 5 : 1);
  useMotionValueEvent(scrollYProgress, 'change', (value) => { if (!reduced) setFilled(Math.min(5, 1 + Math.floor(value * 5.2))); });
  const bar = useTransform(scrollYProgress, [0, 1], ['20%', '100%']);
  const beat = Math.min(BEATS.length - 1, Math.max(0, filled - 2));

  return (
    <section className="su-scene" id="how-it-works" aria-labelledby="su-scene-title">
      <div ref={scene} className={reduced ? 'su-scene-track is-static' : 'su-scene-track'}>
        <div className="su-scene-sticky">
          <p className="su-caption">Lobby mode</p>
          <h2 id="su-scene-title">Five slots. <span>{filled}/5</span></h2>
          <div className="su-scene-slots" aria-hidden>
            {PEOPLE.map((person, index) => (
              <motion.div key={person.name} className={`su-scene-slot${index < filled ? ' is-in' : ''}${person.name === 'You' ? ' is-you' : ''}`}
                animate={reduced ? undefined : { y: index < filled ? 0 : 12, opacity: index < filled ? 1 : 0.35 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
                {index < filled
                  ? <>{person.avatarUrl ? <img src={person.avatarUrl} alt="" /> : <span className="su-scene-you">You</span>}<b>{person.name}</b><small>{person.role}</small></>
                  : <><span className="su-scene-plus">+</span><small>{person.role}</small></>}
              </motion.div>
            ))}
          </div>
          <div className="su-scene-bar" aria-hidden><motion.span style={reduced ? { width: '100%' } : { width: bar }} /></div>
          <ol className="su-scene-beats">
            {BEATS.map((item, index) => (
              <li key={item.title} className={reduced || index === beat ? 'is-now' : index < beat ? 'is-done' : ''}>
                <b>{item.title}</b><span>{item.body}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="su-scene-try">
        <div>
          <p className="su-caption">Try it</p>
          <h3>Ask for a slot in a sample lobby.</h3>
        </div>
        <div className="su-scene-try-card"><DemoLobby /></div>
      </div>
    </section>
  );
}
