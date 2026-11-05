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

/** Where a card flies to when it leaves: past the viewport edge on its side. */
export function exitX(direction: SwipeDirection, viewportWidth: number): number {
  const distance = Math.max(viewportWidth, 600) * 1.2;
  return direction === 'right' ? distance : -distance;
}
