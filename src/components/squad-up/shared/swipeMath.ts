export type SwipeDirection = 'left' | 'right';

/** How far (px) a card must travel, capped so wide screens don't need a huge drag. */
export function swipeThreshold(cardWidth: number): number {
  return Math.min(140, Math.max(80, cardWidth * 0.28));
}

/** A flick counts even when the card has not travelled far, as long as it moved the same way. */
export const FLICK_VELOCITY = 600;

/** Decides a drag's outcome from how far and how fast it went. Null means spring back. */
export function decideSwipe(offsetX: number, velocityX: number, cardWidth: number): SwipeDirection | null {
  const threshold = swipeThreshold(cardWidth);
  if (offsetX > threshold || (velocityX > FLICK_VELOCITY && offsetX > 20)) return 'right';
  if (offsetX < -threshold || (velocityX < -FLICK_VELOCITY && offsetX < -20)) return 'left';
  return null;
}

/** Where a card flies to when it leaves: just past the viewport edge. */
export function exitX(direction: SwipeDirection, viewportWidth: number): number {
  const distance = viewportWidth * 1.15 + 60;
  return direction === 'right' ? distance : -distance;
}

/** 0 at rest, 1 once the card has travelled far enough that letting go commits the swipe. */
export function dragProgress(offsetX: number, cardWidth: number): number {
  return Math.min(1, Math.abs(offsetX) / swipeThreshold(cardWidth));
}

/** Rotation for a drag: about 1° per 20px, capped at 18°. Grabbed by the bottom, the card pivots the other way. */
export function grabTilt(offsetX: number, grabbedLow: boolean): number {
  const degrees = Math.max(-18, Math.min(18, offsetX / 20));
  return (grabbedLow ? -degrees : degrees) || 0;
}
