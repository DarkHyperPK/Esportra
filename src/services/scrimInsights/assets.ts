import type { ReportKill, ReportRound } from '@/types/scrimInsights';
import { NO_VALUE } from '@/services/scrimData/format';
import { roundClock } from './present';

export type RoundEnd = 'elimination' | 'detonated' | 'defused' | 'timeout' | 'surrender' | 'unknown';

/** How a round ended, from Riot's round result code. A code we do not recognise is "unknown", never guessed. */
export function roundEnd(code: string | null | undefined): RoundEnd {
  const c = (code ?? '').toLowerCase();
  if (c.includes('elimin')) return 'elimination';
  if (c.includes('detonat')) return 'detonated';
  if (c.includes('defus')) return 'defused';
  if (c.includes('surrender')) return 'surrender';
  if (c.includes('time') || c.includes('expire')) return 'timeout';
  return 'unknown';
}

const END_TEXT: Record<RoundEnd, string> = {
  elimination: 'eliminating the opposition', detonated: 'a spike detonation', defused: 'defusing the spike',
  timeout: 'the round timer running out', surrender: 'a surrender', unknown: 'a result Riot did not describe',
};

/** One full sentence for a round, for hover, focus and screen readers. */
export function roundSentence(r: ReportRound): string {
  const who = r.won === null ? 'No result' : r.won ? 'Your team won' : 'Your team lost';
  const how = r.won === null ? '' : ` by ${END_TEXT[roundEnd(r.resultCode)]}`;
  const side = r.myRole === 'attack' ? ', attacking' : r.myRole === 'defense' ? ', defending' : '';
  const plant = r.plantSite ? `, spike planted at ${r.plantSite}${r.plantMs != null ? ` at ${roundClock(r.plantMs)}` : ''}` : '';
  return `Round ${r.num}: ${who}${how}${side}${plant}. Score ${r.myScore}–${r.theirScore}.`;
}

export type KillMethod = 'weapon' | 'ability' | 'ultimate' | 'spike' | 'melee' | 'fall' | 'other';

const ABILITY_SLOT: Record<string, string> = { ability1: 'Ability1', ability2: 'Ability2', grenadeability: 'Grenade', grenade: 'Grenade', ultimate: 'Ultimate' };

export function killMethod(kill: Pick<ReportKill, 'type' | 'weapon'>): KillMethod {
  const t = (kill.type ?? '').toLowerCase();
  if (t.includes('ultimate')) return 'ultimate';
  if (t.includes('ability')) return 'ability';
  if (t.includes('bomb') || t.includes('spike')) return 'spike';
  if (t.includes('melee')) return 'melee';
  if (t.includes('fall')) return 'fall';
  if (t.includes('weapon')) return 'weapon';
  return kill.weapon ? 'weapon' : 'other';
}

export interface KillArt { label: string; src?: string; method: KillMethod }

export interface KillCatalog {
  weaponName: ReadonlyMap<string, string>;
  /** Weapon id -> the kill-feed icon (falls back to the display icon). */
  weaponIcon: ReadonlyMap<string, string>;
  /** Agent id -> ability slot ("Ability1", "Grenade", "Ultimate") -> its icon and name. */
  abilities: ReadonlyMap<string, ReadonlyMap<string, { icon?: string; name?: string }>>;
}

const FIXED: Partial<Record<KillMethod, string>> = { spike: 'Spike', melee: 'Melee', fall: 'Fall damage' };

/** What to draw for how a kill was made: the weapon's icon, the agent's ability icon, or a labelled fallback. Never a raw id. */
export function killArt(kill: Pick<ReportKill, 'type' | 'weapon'>, killerAgentId: string | null | undefined, catalog: KillCatalog): KillArt {
  const method = killMethod(kill);
  const id = (kill.weapon ?? '').toLowerCase();
  if (method === 'weapon') {
    return { method, label: catalog.weaponName.get(id) ?? 'Weapon', src: catalog.weaponIcon.get(id) };
  }
  if (method === 'ability' || method === 'ultimate') {
    const slot = method === 'ultimate' ? 'Ultimate' : ABILITY_SLOT[id] ?? '';
    const ability = killerAgentId ? catalog.abilities.get(killerAgentId.toLowerCase())?.get(slot) : undefined;
    return { method, label: ability?.name ?? (method === 'ultimate' ? 'Ultimate' : 'Ability'), src: ability?.icon };
  }
  return { method, label: FIXED[method] ?? NO_VALUE };
}
