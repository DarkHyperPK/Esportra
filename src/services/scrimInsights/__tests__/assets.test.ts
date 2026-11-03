import { describe, expect, it } from 'vitest';
import { killArt, killMethod, killfeedWeaponIcon, ROUND_END_ICON, roundEnd, roundSentence, type KillCatalog } from '../assets';
import type { ReportRound } from '@/types/scrimInsights';

const round = (over: Partial<ReportRound> = {}): ReportRound => ({
  num: 7, won: true, myRole: 'attack', resultCode: 'Elimination', plantSite: 'A', plantMs: 32000, defused: false, defuseMs: null, firstKiller: null, firstVictim: null,
  firstBloodMine: null, firstBloodMs: null, myScore: 4, theirScore: 3, myLoadout: null, theirLoadout: null, myBuy: null, theirBuy: null, pistol: false, ...over,
});

const catalog: KillCatalog = {
  weaponName: new Map([['w1', 'Vandal']]),
  weaponIcon: new Map([['w1', 'https://x/vandal.png']]),
  armorName: new Map(), armorIcon: new Map(),
  abilities: new Map([['agent-1', new Map([['Grenade', { icon: 'https://x/nade.png', name: 'Blaze' }], ['Ultimate', { icon: 'https://x/ult.png', name: 'Hot Hands' }]])]]),
};

describe('round endings', () => {
  it.each([['Elimination', 'elimination'], ['Detonate', 'detonated'], ['Bomb detonated', 'detonated'], ['Defuse', 'defused'], ['Surrendered', 'surrender'], ['Time expired', 'timeout'], ['', 'unknown'], [null, 'unknown'], ['Mystery', 'unknown']] as const)('reads %s as %s', (code, end) => {
    expect(roundEnd(code)).toBe(end);
  });

  it('describes a round in a full sentence with the side, the plant and the score', () => {
    expect(roundSentence(round())).toBe('Round 7: Your team won by eliminating the opposition, attacking, spike planted at A at 0:32. Score 4–3.');
    expect(roundSentence(round({ won: false, resultCode: 'Defuse', myRole: 'defense', plantSite: null }))).toBe('Round 7: Your team lost by defusing the spike, defending. Score 4–3.');
    expect(roundSentence(round({ won: null }))).toContain('No result');
  });
});

describe('kill art', () => {
  it('uses the game’s kill-feed art for a weapon kill, with the catalog icon as the fallback', () => {
    expect(killArt({ type: 'Weapon', weapon: 'W1' }, 'agent-1', catalog)).toEqual({
      method: 'weapon', label: 'Vandal', src: '/air-hud/core/assets/weapons/VandalKillfeed.webp', fallbackSrc: 'https://x/vandal.png', silhouette: true,
    });
  });

  it('never shows a raw id for a weapon the catalog does not know', () => {
    const art = killArt({ type: 'Weapon', weapon: '1234abcd-0000' }, null, catalog);
    expect(art.label).toBe('Weapon');
    expect(art.src).toBe('/air-hud/core/assets/weapons/UnknownKillfeed.webp');
  });

  it('uses the killer agent’s ability icon for ability and ultimate kills', () => {
    expect(killArt({ type: 'Ability', weapon: 'GrenadeAbility' }, 'AGENT-1', catalog)).toEqual({ method: 'ability', label: 'Blaze', src: 'https://x/nade.png', silhouette: false });
    expect(killArt({ type: 'Ultimate', weapon: 'Ultimate' }, 'agent-1', catalog)).toEqual({ method: 'ultimate', label: 'Hot Hands', src: 'https://x/ult.png', silhouette: false });
    expect(killArt({ type: 'Ability', weapon: 'Ability1' }, 'agent-1', catalog)).toEqual({ method: 'ability', label: 'Ability', src: undefined, silhouette: false });
  });

  it('draws the spike, the knife and unknown kills with the game’s own art', () => {
    expect(killArt({ type: 'Bomb', weapon: null }, null, catalog)).toMatchObject({ label: 'Spike', src: '/air-hud/core/assets/misc/Spike_Icon.svg' });
    expect(killArt({ type: 'Melee', weapon: null }, null, catalog)).toMatchObject({ label: 'Melee', src: '/air-hud/core/assets/weapons/KnifeKillfeed.webp' });
    expect(killArt({ type: 'Fall', weapon: null }, null, catalog).label).toBe('Fall damage');
    expect(killMethod({ type: 'Melee', weapon: null })).toBe('melee');
  });

  it('treats a kill with no type but a weapon as a weapon kill', () => {
    expect(killMethod({ type: null, weapon: 'w1' })).toBe('weapon');
    expect(killMethod({ type: null, weapon: null })).toBe('other');
  });

  it('points at the round-win-reason art and the weapon silhouette files by name', () => {
    expect(ROUND_END_ICON.elimination).toBe('/air-hud/core/assets/roundWinReason/kills.webp');
    expect(ROUND_END_ICON.defused).toBe('/air-hud/core/assets/roundWinReason/defused.webp');
    expect(killfeedWeaponIcon('Judge')).toBe('/air-hud/core/assets/weapons/JudgeKillfeed.webp');
    expect(killfeedWeaponIcon(undefined)).toBeUndefined();
  });
});
