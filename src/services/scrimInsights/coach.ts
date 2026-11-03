import type { Rate } from '@/types/scrimReport';

/** The decisive-moments figures, in one shape for a single map and for a whole team (the two are named a little differently by the API). */
export interface CoachView {
  trades: { deaths: number; traded: number; tradeKills: number };
  led: Rate; trailed: Rate; postPlant: Rate; postPlantBySite: Array<{ site: string; won: Rate }>; noPlant: Rate; retake: Rate; retakeBySite: Array<{ site: string; won: Rate }>;
  afterPistolWin: Rate; afterPistolLoss: Rate; antiEco: Rate; ecoUpsets: Rate; loadoutAhead: Rate; loadoutBehind: Rate; slow: Rate; avgFirstKillMs: number | null;
  clutches: Array<{ versus: number; attempts: number; wins: number }>;
}

export interface CoachRow { label: string; rate: Rate; help: string }
export interface CoachGroup { title: string; rows: CoachRow[] }

interface MapCoach {
  trades: CoachView['trades']; ledRounds: Rate; trailedRounds: Rate; postPlant: Rate; postPlantBySite: CoachView['postPlantBySite']; noPlantOnAttack: Rate; retake: Rate;
  retakeBySite: CoachView['retakeBySite']; afterPistolWin: Rate; afterPistolLoss: Rate; antiEco: Rate; ecoUpsets: Rate; loadoutAhead: Rate; loadoutBehind: Rate;
  slowRounds: Rate; avgFirstKillMs: number | null; clutches: Array<{ versus: number; won: boolean }>;
}

interface TeamCoach {
  trades: CoachView['trades']; led: Rate; trailed: Rate; postPlant: Rate; postPlantBySite: CoachView['postPlantBySite']; noPlantOnAttack: Rate; retake: Rate;
  retakeBySite: CoachView['retakeBySite']; afterPistolWin: Rate; afterPistolLoss: Rate; antiEco: Rate; ecoUpsets: Rate; loadoutAhead: Rate; loadoutBehind: Rate;
  slowRounds: Rate; avgFirstKillMs: number | null; clutches: CoachView['clutches'];
}

export function fromTeam(c: TeamCoach): CoachView {
  return { trades: c.trades, led: c.led, trailed: c.trailed, postPlant: c.postPlant, postPlantBySite: c.postPlantBySite, noPlant: c.noPlantOnAttack, retake: c.retake, retakeBySite: c.retakeBySite,
    afterPistolWin: c.afterPistolWin, afterPistolLoss: c.afterPistolLoss, antiEco: c.antiEco, ecoUpsets: c.ecoUpsets, loadoutAhead: c.loadoutAhead, loadoutBehind: c.loadoutBehind,
    slow: c.slowRounds, avgFirstKillMs: c.avgFirstKillMs, clutches: c.clutches };
}

export function fromMap(c: MapCoach): CoachView {
  const byVs = new Map<number, { attempts: number; wins: number }>();
  for (const k of c.clutches) { const cur = byVs.get(k.versus) ?? { attempts: 0, wins: 0 }; byVs.set(k.versus, { attempts: cur.attempts + 1, wins: cur.wins + (k.won ? 1 : 0) }); }
  return { trades: c.trades, led: c.ledRounds, trailed: c.trailedRounds, postPlant: c.postPlant, postPlantBySite: c.postPlantBySite, noPlant: c.noPlantOnAttack, retake: c.retake, retakeBySite: c.retakeBySite,
    afterPistolWin: c.afterPistolWin, afterPistolLoss: c.afterPistolLoss, antiEco: c.antiEco, ecoUpsets: c.ecoUpsets, loadoutAhead: c.loadoutAhead, loadoutBehind: c.loadoutBehind,
    slow: c.slowRounds, avgFirstKillMs: c.avgFirstKillMs, clutches: [...byVs.entries()].sort((a, b) => a[0] - b[0]).map(([versus, v]) => ({ versus, ...v })) };
}

const has = (r: Rate) => r.of > 0;
const rate = (count: number, of: number): Rate => ({ count, of, pct: of > 0 ? Math.round((1000 * count) / of) / 10 : null });

/** The questions a coach asks of a set of rounds, grouped, each with its sample. A question with no rounds behind it is left out, not shown as zero. */
export function coachGroups(c: CoachView): CoachGroup[] {
  const spike: CoachRow[] = [
    { label: 'Won after you planted', rate: c.postPlant, help: 'Post-plant setups and trades: planting should be worth a round.' },
    ...c.postPlantBySite.map((s) => ({ label: `Planted on ${s.site}`, rate: s.won, help: 'Round win rate by the site you planted.' })),
    { label: 'Attack rounds with no plant', rate: c.noPlant, help: 'Attacks that never reached the spike.' },
    { label: 'Won when the opponent planted', rate: c.retake, help: 'Retakes and holds after a plant against you.' },
    ...c.retakeBySite.map((s) => ({ label: `Opponent planted on ${s.site}`, rate: s.won, help: 'Round win rate by the site they planted.' })),
  ];
  const alive: CoachRow[] = [
    { label: 'Deaths avenged within 5 s', rate: rate(c.trades.traded, c.trades.deaths), help: 'Players dying alone, or with a teammate close enough to trade.' },
    { label: 'Won when ahead on players', rate: c.led, help: 'Rounds where you had more players alive at some point: leads should be converted.' },
    { label: 'Won when behind on players', rate: c.trailed, help: 'Rounds you came back from a disadvantage.' },
  ];
  const economy: CoachRow[] = [
    { label: 'Round after winning pistol', rate: c.afterPistolWin, help: 'Converting a pistol win into the bonus round.' },
    { label: 'Round after losing pistol', rate: c.afterPistolLoss, help: 'Surviving the round after a lost pistol.' },
    { label: 'Full buy against an eco', rate: c.antiEco, help: 'Rounds that should be won: every loss here is a gift.' },
    { label: 'Eco against a full buy', rate: c.ecoUpsets, help: 'Stolen rounds.' },
    { label: 'Won with a 1,000+ loadout edge', rate: c.loadoutAhead, help: 'Does the better economy turn into rounds?' },
    { label: 'Won with a 1,000+ loadout deficit', rate: c.loadoutBehind, help: 'Rounds won from behind in the economy.' },
  ];
  const clutch: CoachRow[] = c.clutches.map((v) => ({ label: `1v${v.versus} situations`, rate: rate(v.wins, v.attempts), help: 'Last player alive against that many enemies.' }));
  const tempo: CoachRow[] = [{ label: 'Won when the first kill came late (30 s+)', rate: c.slow, help: 'Slow, patient rounds.' }];
  return [
    { title: 'Spike', rows: spike }, { title: 'Players alive', rows: alive }, { title: 'Economy', rows: economy }, { title: 'Clutches', rows: clutch }, { title: 'Tempo', rows: tempo },
  ].map((g) => ({ ...g, rows: g.rows.filter((r) => has(r.rate)) })).filter((g) => g.rows.length > 0);
}
