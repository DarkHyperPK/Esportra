import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { Heart, X } from 'lucide-react';
import { useLfgReducedMotion } from '@/hooks/competitive/useLfgReducedMotion';
import type { SquadUpCard as SquadUpCardData } from '@/schemas/squadUp';
import { SquadUpCard } from './SquadUpCard';

const SWIPE_DISTANCE = 120;

interface SquadUpDeckProps {
  card: SquadUpCardData;
  onSwipe: (card: SquadUpCardData, direction: 'right' | 'left') => void;
  onReport?: (card: SquadUpCardData) => void;
  disabled?: boolean;
}

export function SquadUpDeck({ card, onSwipe, onReport, disabled = false }: SquadUpDeckProps) {
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
    <div className="squad-deck" onKeyDown={onKeyDown} role="group" aria-label="Player deck" tabIndex={0}>
      <div className="squad-stack">
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
          <SquadUpCard card={card} onReport={onReport ? () => onReport(card) : undefined} />
        </motion.div>
      </div>
      <div className="squad-actions">
        <button type="button" className="lfg-button" disabled={disabled} onClick={() => onSwipe(card, 'left')}>
          <X size={16} aria-hidden /> Pass
        </button>
        <button type="button" className="lfg-button lfg-button-primary" disabled={disabled} onClick={() => onSwipe(card, 'right')}>
          <Heart size={16} aria-hidden /> Let&apos;s squadUp
        </button>
      </div>
      <p className="squad-hint">Drag the card or use the arrow keys.</p>
    </div>
  );
}
