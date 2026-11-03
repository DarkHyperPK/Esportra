import { describe, expect, it } from 'vitest';
import type { InsightsReport } from '@/types/scrimInsights';
import { summariseSpike } from '../spike';

const rate = (count: number, of: number) => ({ count, of, pct: of ? Math.round((1000 * count) / of) / 10 : null });
const round = (myRole: 'attack' | 'defense', won: boolean, plantSite: string | null) => ({ myRole, won, plantSite });

function report(rounds: Array<ReturnType<typeof round>>, coach: Record<string, unknown> = {}): InsightsReport {
  return { rounds, coach: { postPlant: rate(0, 0), postPlantBySite: [], retake: rate(0, 0), retakeBySite: [], ...coach }, objectives: { avgPlantMs: 40000 } } as unknown as InsightsReport;
}

describe('summariseSpike', () => {
  it('counts plants on attack, rounds lost without one, and rounds won before a plant on defense', () => {
    const s = summariseSpike(report([
      round('attack', true, 'A'), round('attack', false, null), round('attack', false, null), round('attack', true, 'B'), round('attack', false, null),
      round('defense', true, null), round('defense', false, 'A'), round('defense', true, null),
    ]));
    expect(s.planted).toEqual(rate(2, 5));
    expect(s.lostWithoutPlant).toEqual(rate(3, 3));
    expect(s.stoppedBeforePlant).toEqual(rate(2, 2));
    expect(s.avgPlantMs).toBe(40000);
  });

  it('blames the plant when it goes down in under half the attack rounds', () => {
    const rounds = [round('attack', false, null), round('attack', false, null), round('attack', true, 'A'), round('attack', false, null)];
    expect(summariseSpike(report(rounds)).verdict).toMatch(/1 of 4 attack rounds.*lost 3 of the 3/);
  });

  it('blames holding the plant, then the retake, when those are the weak spot', () => {
    const planted = [round('attack', true, 'A'), round('attack', false, 'A'), round('attack', false, 'A'), round('attack', true, 'B')];
    expect(summariseSpike(report(planted, { postPlant: rate(1, 4) })).verdict).toMatch(/won only 1 of 4 rounds once the spike was down/);
    const solid = [round('attack', true, 'A'), round('attack', true, 'A'), round('attack', true, 'A'), round('attack', true, 'A')];
    expect(summariseSpike(report(solid, { postPlant: rate(4, 4), retake: rate(1, 4) })).verdict).toMatch(/retook 1 of 4 plants/);
  });

  it('refuses to call a thin sample and clears a map where spike play was fine', () => {
    expect(summariseSpike(report([round('attack', true, 'A')])).verdict).toMatch(/Too few spike rounds/);
    const solid = [round('attack', true, 'A'), round('attack', true, 'A'), round('attack', true, 'B'), round('attack', true, 'B')];
    expect(summariseSpike(report(solid, { postPlant: rate(4, 4), retake: rate(3, 4) })).verdict).toMatch(/not what decided/);
  });
});
