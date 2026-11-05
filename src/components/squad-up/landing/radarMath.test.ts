import { describe, expect, it } from 'vitest';
import { blipPosition } from './radarMath';

describe('blipPosition', () => {
  it('keeps every blip in a ring around the deck, inside the scope', () => {
    for (const id of ['d1', 'd2', 'd3', 'player-with-a-long-id', 'x']) {
      const { left, top } = blipPosition(id);
      const distance = Math.hypot(left - 50, top - 50);
      expect(distance).toBeGreaterThanOrEqual(33.9);
      expect(distance).toBeLessThanOrEqual(47.1);
    }
  });

  it('puts the same player in the same place every time', () => {
    expect(blipPosition('d4')).toEqual(blipPosition('d4'));
    expect(blipPosition('d4')).not.toEqual(blipPosition('d5'));
  });
});
