import { describe, expect, it } from 'vitest';
import { isBrGameLive, resolveActiveBRGameMap } from '@/utils/brGameContext';

describe('resolveActiveBRGameMap', () => {
  it('returns map only for active games', () => {
    const games = [
      { status: 'pending', map: 'Erangel' },
      { status: 'pending', map: 'Miramar' },
    ];
    expect(resolveActiveBRGameMap(games)).toBeNull();
  });

  it('ignores pending games even when they have maps', () => {
    const games = [
      { status: 'active', map: 'Sanhok' },
      { status: 'pending', map: 'Erangel' },
    ];
    expect(resolveActiveBRGameMap(games)).toBe('Sanhok');
  });
});

describe('isBrGameLive', () => {
  it('is true only for active status', () => {
    expect(isBrGameLive('active')).toBe(true);
    expect(isBrGameLive('pending')).toBe(false);
    expect(isBrGameLive(null)).toBe(false);
  });
});
