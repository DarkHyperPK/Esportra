import { describe, expect, it } from 'vitest';
import { fieldTransition, fieldInitial, FORMAT_CARD_TAP } from './quickCreateMotion';

describe('fieldTransition', () => {
  it('fieldTransition_ReturnsSpringTransition_WithCorrectDelay', () => {
    const result = fieldTransition(3, false);
    expect(result).toEqual({
      type: 'spring',
      stiffness: 300,
      damping: 26,
      delay: 0.28 + 3 * 0.045,
    });
  });

  it('fieldTransition_ReturnsShortTransition_WhenReducedMotion', () => {
    const result = fieldTransition(3, true);
    expect(result).toEqual({ duration: 0.15 });
  });
});

describe('fieldInitial', () => {
  it('fieldInitial_IncludesY_WhenFullMotion', () => {
    expect(fieldInitial(false)).toEqual({ opacity: 0, y: 10 });
  });

  it('fieldInitial_OmitsY_WhenReducedMotion', () => {
    expect(fieldInitial(true)).toEqual({ opacity: 0 });
  });
});

describe('FORMAT_CARD_TAP', () => {
  it('FORMAT_CARD_TAP_HasCorrectScale', () => {
    expect(FORMAT_CARD_TAP.scale).toBe(0.96);
  });
});
