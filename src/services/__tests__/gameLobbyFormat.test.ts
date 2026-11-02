import { describe, expect, it } from 'vitest';
import { getLobbyFormat } from '../gameLobbyFormat';

describe('getLobbyFormat', () => {
  it('uses a single party code for valorant', () => {
    const fmt = getLobbyFormat('valorant');
    expect(fmt.fieldOneLabel).toBe('Party code');
    expect(fmt.fieldTwo).toBeNull();
  });

  it('keeps IP and password for cs2', () => {
    expect(getLobbyFormat('cs2').fieldTwo?.label).toBe('Password');
  });

  it('falls back to code and password for other games', () => {
    expect(getLobbyFormat('other').fieldOneLabel).toBe('Lobby Code');
  });
});
