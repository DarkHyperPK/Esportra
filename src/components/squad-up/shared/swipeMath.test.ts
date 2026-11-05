import { describe, expect, it } from 'vitest';
import { decideSwipe, exitX, swipeThreshold } from './swipeMath';

describe('swipeMath', () => {
  it('scales the distance threshold with card width, clamped to 80–140px', () => {
    expect(swipeThreshold(200)).toBe(80);
    expect(swipeThreshold(400)).toBeCloseTo(112);
    expect(swipeThreshold(1000)).toBe(140);
  });

  it('commits a swipe once the card passes the threshold either way', () => {
    expect(decideSwipe(130, 0, 400)).toBe('right');
    expect(decideSwipe(-130, 0, 400)).toBe('left');
  });

  it('springs back on a short, slow drag', () => {
    expect(decideSwipe(60, 100, 400)).toBeNull();
    expect(decideSwipe(-60, -100, 400)).toBeNull();
  });

  it('counts a fast flick in the same direction even when short', () => {
    expect(decideSwipe(30, 900, 400)).toBe('right');
    expect(decideSwipe(-30, -900, 400)).toBe('left');
  });

  it('ignores a flick against the drag direction or a near-still tap', () => {
    expect(decideSwipe(-30, 900, 400)).toBeNull();
    expect(decideSwipe(10, 900, 400)).toBeNull();
  });

  it('flings the card fully off screen on its own side', () => {
    expect(exitX('right', 390)).toBe(720);
    expect(exitX('left', 1440)).toBe(-1728);
  });
});
