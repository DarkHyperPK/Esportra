import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useLfgReducedMotion } from '@/hooks/competitive/useLfgReducedMotion';
import type { SlatePlayer } from '../shared/slate';
import { blipPosition } from './radarMath';


interface SignalRadarProps {
  players: SlatePlayer[];
  topId?: string;
  onPick: (id: string) => void;
}

/**
 * The scope behind the hero deck: a sweep turns over rings, and each player still in the deck is a blip.
 * Tap a blip to bring that player to the front. The scope drifts with the pointer for depth.
 */
export function SignalRadar({ players, topId, onPick }: SignalRadarProps) {
  const reduced = useLfgReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 18 });
  const sy = useSpring(py, { stiffness: 60, damping: 18 });
  const farX = useTransform(sx, (v) => v * 0.5);
  const farY = useTransform(sy, (v) => v * 0.5);
  const root = useRef<HTMLDivElement>(null);

  // The scope sits behind the deck and lets pointer events through, so it follows the mouse from the window.
  useEffect(() => {
    if (reduced) return undefined;
    const onMove = (event: PointerEvent) => {
      const box = root.current?.getBoundingClientRect();
      if (event.pointerType !== 'mouse' || !box) return;
      px.set(Math.max(-1, Math.min(1, (event.clientX - box.left) / box.width - 0.5)) * 28);
      py.set(Math.max(-1, Math.min(1, (event.clientY - box.top) / box.height - 0.5)) * 28);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduced, px, py]);

  return (
    <div ref={root} className="su-radar">
      <motion.div className="su-radar-scope" style={reduced ? undefined : { x: farX, y: farY }} aria-hidden>
        <svg viewBox="0 0 400 400" className="su-radar-rings">
          {[70, 120, 165, 198].map((r) => <circle key={r} cx="200" cy="200" r={r} />)}
          <line x1="200" y1="0" x2="200" y2="400" />
          <line x1="0" y1="200" x2="400" y2="200" />
        </svg>
        {!reduced && <div className="su-radar-sweep" />}
      </motion.div>
      <motion.ul className="su-radar-blips" style={reduced ? undefined : { x: sx, y: sy }} aria-label="Sample players on the signal">
        {players.map((player, index) => {
          const { left, top } = blipPosition(player.id);
          return (
            <li key={player.id} style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${(index * 0.37) % 3}s` }}
              className={`su-blip${player.id === topId ? ' is-top' : ''}${player.likedYou ? ' is-liked' : ''}`}>
              <button type="button" onClick={() => onPick(player.id)} aria-label={`Show ${player.name}, ${player.tierName ?? 'unranked'}`}>
                {player.avatarUrl ? <img src={player.avatarUrl} alt="" draggable={false} /> : player.name.slice(0, 1)}
              </button>
              <span className="su-blip-tag" aria-hidden>{player.tierName}</span>
            </li>
          );
        })}
      </motion.ul>
    </div>
  );
}
