import type { InsightsReport, Rate } from '@/types/scrimInsights';

/** Fewer rounds than this and the verdict says there is too little to call. */
export const MIN_SPIKE_ROUNDS = 4;
const LOW_PLANT_RATE = 0.5;
const LOW_POST_PLANT = 0.6;
const LOW_RETAKE = 0.35;

type Coach = NonNullable<InsightsReport['coach']>;
const NONE: Rate = { count: 0, of: 0, pct: null };
const rate = (count: number, of: number): Rate => ({ count, of, pct: of === 0 ? null : Math.round((1000 * count) / of) / 10 });

export interface SpikeSummary {
  /** Attack: rounds played, rounds the spike went down, rounds lost with no plant. */
  planted: Rate;
  lostWithoutPlant: Rate;
  postPlant: Rate;
  postPlantBySite: Coach['postPlantBySite'];
  /** Defense: rounds the opponent planted and how many were retaken, plus rounds won before any plant. */
  retake: Rate;
  retakeBySite: Coach['retakeBySite'];
  stoppedBeforePlant: Rate;
  avgPlantMs: number | null;
  verdict: string;
}

/** The spike story of one map from your side: do you get the plant down, do you win once it is down, and the same for the opponent's plants. */
export function summariseSpike(report: InsightsReport): SpikeSummary {
  const attack = report.rounds.filter((r) => r.myRole === 'attack');
  const defense = report.rounds.filter((r) => r.myRole === 'defense');
  const planted = attack.filter((r) => r.plantSite !== null);
  const unplanted = attack.filter((r) => r.plantSite === null);
  const noPlantDefense = defense.filter((r) => r.plantSite === null);
  const c = report.coach;
  const summary = {
    planted: rate(planted.length, attack.length),
    lostWithoutPlant: rate(unplanted.filter((r) => r.won === false).length, unplanted.length),
    postPlant: c?.postPlant ?? NONE, postPlantBySite: c?.postPlantBySite ?? [], retake: c?.retake ?? NONE, retakeBySite: c?.retakeBySite ?? [],
    stoppedBeforePlant: rate(noPlantDefense.filter((r) => r.won === true).length, noPlantDefense.length),
    avgPlantMs: report.objectives.avgPlantMs,
  };
  return { ...summary, verdict: spikeVerdict(summary) };
}

function spikeVerdict(s: Omit<SpikeSummary, 'verdict'>): string {
  if (s.planted.of >= MIN_SPIKE_ROUNDS && (s.planted.pct ?? 100) / 100 < LOW_PLANT_RATE) {
    return `You got the spike down in ${s.planted.count} of ${s.planted.of} attack rounds, and lost ${s.lostWithoutPlant.count} of the ${s.lostWithoutPlant.of} where it never went down. The plant is the problem, not what happens after.`;
  }
  if (s.postPlant.of >= MIN_SPIKE_ROUNDS - 1 && (s.postPlant.pct ?? 100) / 100 < LOW_POST_PLANT) {
    return `You won only ${s.postPlant.count} of ${s.postPlant.of} rounds once the spike was down. The plants happen; holding them is the problem.`;
  }
  if (s.retake.of >= MIN_SPIKE_ROUNDS - 1 && (s.retake.pct ?? 100) / 100 < LOW_RETAKE) {
    return `You retook ${s.retake.count} of ${s.retake.of} plants. Once the opponent plants, you rarely get the round back.`;
  }
  if (s.planted.of < MIN_SPIKE_ROUNDS && s.retake.of < MIN_SPIKE_ROUNDS - 1) return 'Too few spike rounds on this map to call anything.';
  return 'Spike play is not what decided this map.';
}
