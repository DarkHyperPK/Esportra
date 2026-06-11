import { describe, expect, it } from 'vitest';
import { generateBrSchedule } from './brScheduleGenerator';

describe('generateBrSchedule', () => {
  it('K4 produces three waves with two lobbies each', () => {
    const manifest = generateBrSchedule({ seedGroupCount: 4 });

    expect(manifest.totalWaves).toBe(3);
    manifest.waves.forEach((wave) => {
      expect(wave.lobbies).toHaveLength(2);
      const keys = wave.lobbies.map((l) => l.join('+')).sort();
      expect(new Set(keys).size).toBe(keys.length);
    });
    expect(manifest.waves[0].lobbies).toEqual([
      ['A', 'B'],
      ['C', 'D'],
    ]);
  });

  it('K6 wave 1 has three unique lobbies (no duplicate pairs)', () => {
    const manifest = generateBrSchedule({ seedGroupCount: 6 });

    expect(manifest.totalWaves).toBe(5);
    expect(manifest.waves[0].lobbies).toEqual([
      ['A', 'B'],
      ['C', 'F'],
      ['D', 'E'],
    ]);
    const joined = manifest.waves[0].lobbies.map((l) => l.join('+')).join(' · ');
    expect(joined).toBe('A+B · C+F · D+E');
    expect(manifest.waves[0].lobbies).toHaveLength(3);
  });
});
