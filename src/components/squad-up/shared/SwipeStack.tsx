import { forwardRef, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { useLfgReducedMotion } from '@/hooks/competitive/useLfgReducedMotion';
import { decideSwipe, exitX, type SwipeDirection } from './swipeMath';
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
 * A deck of up to three visible cards. Drag the top card sideways (or use the arrow keys / the parent's buttons
 * through the ref): past the threshold or with a flick it flies out and the next card lifts into place;
 * otherwise it springs back. Reduced motion turns the drag off and swaps cards with a fade.
 */
function SwipeStackInner<T>({ items, getId, renderCard, onSwipe, disabled = false, label }: SwipeStackProps<T>, ref: React.Ref<SwipeStackHandle>) {
  const reduced = useLfgReducedMotion();
  const top = useRef<SwipeStackHandle>(null);
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
        <TopCard key={getId(item)} ref={top} reduced={reduced} disabled={disabled} onDone={(direction) => onSwipe(item, direction)}>
          {renderCard(item)}
        </TopCard>
      ) : (
        <motion.div key={getId(item)} className="su-stack-card" aria-hidden
          initial={false} animate={{ scale: 1 - depth * 0.04, y: depth * 14, opacity: 1 - depth * 0.25 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }} style={{ zIndex: 10 - depth }}>
          {renderCard(item)}
        </motion.div>
      )).reverse()}
    </div>
  );
}

type GenericSwipeStack = <Item,>(props: SwipeStackProps<Item> & { ref?: React.Ref<SwipeStackHandle> }) => ReturnType<typeof SwipeStackInner>;

export const SwipeStack = forwardRef(SwipeStackInner) as GenericSwipeStack;

interface TopCardProps { children: ReactNode; reduced: boolean; disabled: boolean; onDone: (direction: SwipeDirection) => void }

const TopCard = forwardRef<SwipeStackHandle, TopCardProps>(({ children, reduced, disabled, onDone }, ref) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-320, 0, 320], [-16, 0, 16]);
  const passWipe = useTransform(x, [-140, -24], [1, 0]);
  const upWipe = useTransform(x, [24, 140], [0, 1]);
  const card = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);

  function fling(direction: SwipeDirection) {
    if (leaving) return;
    setLeaving(true);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(12);
    if (reduced) { onDone(direction); return; }
    void animate(x, exitX(direction, window.innerWidth), { type: 'spring', stiffness: 260, damping: 32, velocity: x.getVelocity() })
      .then(() => onDone(direction));
  }

  useImperativeHandle(ref, () => ({ swipe: fling }));

  function onDragEnd(_event: unknown, info: PanInfo) {
    const direction = decideSwipe(info.offset.x, info.velocity.x, card.current?.offsetWidth ?? 360);
    if (direction) fling(direction);
    else void animate(x, 0, { type: 'spring', stiffness: 500, damping: 34 });
  }

  return (
    <motion.div ref={card} className="su-stack-card su-stack-top" style={reduced ? { zIndex: 20 } : { x, rotate, zIndex: 20 }}
      drag={reduced || disabled ? false : 'x'} dragMomentum={false} onDragEnd={onDragEnd}
      initial={reduced ? { opacity: 0 } : { scale: 0.96, y: 14 }} animate={reduced ? { opacity: 1 } : { scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}>
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
