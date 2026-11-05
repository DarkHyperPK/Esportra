import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { Heart, X } from 'lucide-react';
import { useLfgReducedMotion } from '@/hooks/competitive/useLfgReducedMotion';
import type { QueueCard as QueueCardData } from '@/schemas/lfgQueue';
import { QueueCard } from './QueueCard';

const SWIPE_DISTANCE = 120;

interface QueueDeckProps {
  card: QueueCardData;
  onSwipe: (card: QueueCardData, direction: 'right' | 'left') => void;
  disabled?: boolean;
}

export function QueueDeck({ card, onSwipe, disabled = false }: QueueDeckProps) {
  const reduced = useLfgReducedMotion();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-8, 8]);

  function onDragEnd(_event: unknown, info: PanInfo) {
    if (disabled) return;
    if (info.offset.x > SWIPE_DISTANCE) onSwipe(card, 'right');
    else if (info.offset.x < -SWIPE_DISTANCE) onSwipe(card, 'left');
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (disabled) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); onSwipe(card, 'right'); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); onSwipe(card, 'left'); }
  }

  return (
    <div className="queue-deck" onKeyDown={onKeyDown} role="group" aria-label="Player deck" tabIndex={0}>
      <div className="queue-stack">
        <motion.div
          key={card.userId}
          style={reduced ? undefined : { x, rotate }}
          drag={reduced || disabled ? false : 'x'}
          dragSnapToOrigin
          dragElastic={0.6}
          onDragEnd={onDragEnd}
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <QueueCard card={card} />
        </motion.div>
      </div>
      <div className="queue-actions">
        <button type="button" className="lfg-button" disabled={disabled} onClick={() => onSwipe(card, 'left')}>
          <X size={16} aria-hidden /> Pass
        </button>
        <button type="button" className="lfg-button lfg-button-primary" disabled={disabled} onClick={() => onSwipe(card, 'right')}>
          <Heart size={16} aria-hidden /> Let&apos;s queue
        </button>
      </div>
      <p className="queue-hint">Drag the card or use the arrow keys.</p>
    </div>
  );
}
