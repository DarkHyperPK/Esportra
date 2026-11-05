import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useTransform, type MotionValue, type PanInfo } from 'framer-motion';
import { useLfgReducedMotion } from '@/hooks/competitive/useLfgReducedMotion';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { decideSwipe, dragProgress, exitX, grabTilt, type SwipeDirection } from './swipeMath';
import './squad-up-shared.css';

export interface SwipeStackHandle { swipe: (direction: SwipeDirection) => void }

interface SwipeStackProps<T> {
  items: T[];
  getId: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  onSwipe: (item: T, direction: SwipeDirection) => void;
  disabled?: boolean;
  /** Accessible name for the deck, e.g. "Sample players". */
  label: string;
}

/**
 * A deck of up to three visible cards. The top card follows the finger 1:1 and tilts from where it was grabbed;
 * the card behind rises as you drag, so the deck feels physical. Past the threshold or with a flick the card flies
 * out; otherwise it springs back. Buttons and arrow keys use the same fling. Reduced motion: no drag, a fade.
 */
function SwipeStackInner<T>({ items, getId, renderCard, onSwipe, disabled = false, label }: SwipeStackProps<T>, ref: React.Ref<SwipeStackHandle>) {
  const reduced = useLfgReducedMotion();
  const top = useRef<SwipeStackHandle>(null);
  const progress = useMotionValue(0);
  useImperativeHandle(ref, () => ({ swipe: (direction) => top.current?.swipe(direction) }), []);
  const visible = items.slice(0, 3);

  function onKeyDown(event: React.KeyboardEvent) {
    if (disabled || visible.length === 0) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); top.current?.swipe('right'); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); top.current?.swipe('left'); }
  }

  return (
    <div className="su-stack" role="group" aria-label={label} tabIndex={0} onKeyDown={onKeyDown}>
      {visible.map((item, depth) => depth === 0 ? (
        <TopCard key={getId(item)} ref={top} reduced={reduced} disabled={disabled} progress={progress}
          onDone={(direction) => { progress.set(0); onSwipe(item, direction); }}>
          {renderCard(item)}
        </TopCard>
      ) : (
        <BackCard key={getId(item)} depth={depth} progress={progress} reduced={reduced}>{renderCard(item)}</BackCard>
      )).reverse()}
    </div>
  );
}

type GenericSwipeStack = <Item,>(props: SwipeStackProps<Item> & { ref?: React.Ref<SwipeStackHandle> }) => ReturnType<typeof SwipeStackInner>;

export const SwipeStack = forwardRef(SwipeStackInner) as GenericSwipeStack;

/** A card waiting behind the top one. It rises toward the next position as the top card is dragged away. */
function BackCard({ depth, progress, reduced, children }: { depth: number; progress: MotionValue<number>; reduced: boolean; children: ReactNode }) {
  const scale = useTransform(progress, [0, 1], [1 - depth * 0.05, 1 - (depth - 1) * 0.05]);
  const y = useTransform(progress, [0, 1], [depth * 16, (depth - 1) * 16]);
  const opacity = useTransform(progress, [0, 1], [1 - depth * 0.3, 1 - (depth - 1) * 0.3]);
  return (
    <motion.div className="su-stack-card" aria-hidden style={reduced ? { zIndex: 10 - depth, opacity: 0 } : { scale, y, opacity, zIndex: 10 - depth }}>
      {children}
    </motion.div>
  );
}

interface TopCardProps {
  children: ReactNode;
  reduced: boolean;
  disabled: boolean;
  progress: MotionValue<number>;
  onDone: (direction: SwipeDirection) => void;
}

const buzz = (ms: number) => { if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(ms); };

const TopCard = forwardRef<SwipeStackHandle, TopCardProps>(({ children, reduced, disabled, progress, onDone }, ref) => {
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');
  const x = useMotionValue(0);
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const grabbedLow = useRef(false);
  const pastThreshold = useRef(false);
  const card = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);
  const width = () => card.current?.offsetWidth ?? 360;

  // Grabbed low, the card pivots the other way, like holding a real card by its bottom edge.
  const rotate = useTransform(x, (value) => grabTilt(value, grabbedLow.current));
  const passWipe = useTransform(x, [-140, -24], [1, 0]);
  const upWipe = useTransform(x, [24, 140], [0, 1]);
  // Drives the cards behind, and ticks once when the drag crosses the point where letting go commits.
  useEffect(() => x.on('change', (value) => {
    const p = dragProgress(value, card.current?.offsetWidth ?? 360);
    progress.set(p);
    if (p >= 1 !== pastThreshold.current) { pastThreshold.current = p >= 1; if (p >= 1) buzz(8); }
  }), [x, progress]);

  function fling(direction: SwipeDirection) {
    if (leaving) return;
    setLeaving(true);
    buzz(14);
    if (reduced) { onDone(direction); return; }
    void animate(x, exitX(direction, window.innerWidth), { type: 'spring', stiffness: 220, damping: 30, velocity: x.getVelocity() })
      .then(() => onDone(direction));
  }

  useImperativeHandle(ref, () => ({ swipe: fling }));

  function onPointerDown(event: React.PointerEvent) {
    const box = card.current?.getBoundingClientRect();
    grabbedLow.current = !!box && event.clientY > box.top + box.height * 0.6;
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!finePointer || reduced || x.get() !== 0) return;
    const box = card.current?.getBoundingClientRect();
    if (!box) return;
    tiltY.set(((event.clientX - box.left) / box.width - 0.5) * 8);
    tiltX.set(-((event.clientY - box.top) / box.height - 0.5) * 8);
  }

  function resetTilt() { void animate(tiltX, 0, { duration: 0.3 }); void animate(tiltY, 0, { duration: 0.3 }); }

  function onDragEnd(_event: unknown, info: PanInfo) {
    const direction = decideSwipe(info.offset.x, info.velocity.x, width());
    if (direction) fling(direction);
    else void animate(x, 0, { type: 'spring', stiffness: 520, damping: 30 });
  }

  return (
    <motion.div ref={card} className="su-stack-card su-stack-top"
      style={reduced ? { zIndex: 20 } : { x, rotate, rotateX: tiltX, rotateY: tiltY, zIndex: 20, transformPerspective: 900 }}
      drag={reduced || disabled || leaving ? false : 'x'} dragMomentum={false} onDragStart={resetTilt} onDragEnd={onDragEnd}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerLeave={resetTilt}
      whileTap={reduced || disabled ? undefined : { scale: 1.015 }}
      initial={reduced ? { opacity: 0 } : false} animate={reduced ? { opacity: 1 } : undefined}>
      {children}
      {!reduced && (
        <>
          <motion.span className="su-wipe su-wipe-pass" style={{ opacity: passWipe }} aria-hidden><span>Pass</span></motion.span>
          <motion.span className="su-wipe su-wipe-up" style={{ opacity: upWipe }} aria-hidden><span>Squad up</span></motion.span>
        </>
      )}
    </motion.div>
  );
});
TopCard.displayName = 'SwipeTopCard';
