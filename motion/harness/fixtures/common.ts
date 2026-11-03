/**
 * Shared fictional sample data for the capture harness.
 * Team names, tags and crests are placeholders (the house sample teams from
 * design/source plus a few more), never real teams or players.
 */

export const NOW = Date.now();
export const iso = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();
export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

/**
 * Same geometric monogram as design/source/lib.mjs `crest()`: clearly a sample crest.
 * Drawn on a canvas after the brand fonts load, so the initials are set in Poppins.
 */
const crestCache = new Map<string, string>();
export function crest(initials: string, hue: number, shape = 0): string {
  const key = `${initials}|${hue}|${shape}`;
  const hit = crestCache.get(key);
  if (hit) return hit;
  const shapes = [
    'M50 4 L92 20 L92 56 Q92 84 50 96 Q8 84 8 56 L8 20 Z',
    'M50 4 L96 50 L50 96 L4 50 Z',
    'M16 4 H84 L96 16 V84 L84 96 H16 L4 84 V16 Z',
    'M50 4 L90 27 V73 L50 96 L10 73 V27 Z',
  ];
  const c = document.createElement('canvas');
  c.width = 240; c.height = 240;
  const g = c.getContext('2d')!;
  g.scale(2.4, 2.4);
  g.fillStyle = '#111114';
  g.fillRect(0, 0, 100, 100);
  const path = new Path2D(shapes[shape % 4]);
  g.fillStyle = `hsl(${hue} 55% 18%)`;
  g.fill(path);
  g.lineWidth = 4;
  g.strokeStyle = `hsl(${hue} 70% 55%)`;
  g.stroke(path);
  g.fillStyle = `hsl(${hue} 70% 55%)`;
  g.font = `900 ${initials.length > 2 ? 26 : 34}px Poppins`;
  g.textAlign = 'center';
  g.fillText(initials, 50, shape === 1 ? 60 : 62);
  const url = c.toDataURL('image/png');
  crestCache.set(key, url);
  return url;
}

export interface SampleTeam {
  id: string;
  name: string;
  tag: string;
  hue: number;
  shape: number;
  logo: string;
  card: string;
}

const card = (uuid: string) => `https://media.valorant-api.com/playercards/${uuid}/wideart.png`;

function team(id: string, name: string, tag: string, hue: number, shape: number, cardUuid: string): SampleTeam {
  return { id, name, tag, hue, shape, get logo() { return crest(tag, hue, shape); }, card: card(cardUuid) };
}

export const TEAMS = {
  owls: team('t-owls', 'Night Owls', 'NO', 265, 0, '9397e078-4140-cc2b-4fcd-b0afedb9ece8'),
  crimson: team('t-crimson', 'Crimson Five', 'C5', 0, 2, '83bffdf0-4aa8-bcf4-7e32-a5a508cbd0f0'),
  neon: team('t-neon', 'Neon District', 'ND', 190, 3, '3d3e270e-4c89-ea1f-2bea-32a40a21dd75'),
  tigers: team('t-tigers', 'Paper Tigers', 'PT', 35, 1, '37b91851-4ebd-c871-c943-87aefb75ae7d'),
  orbit: team('t-orbit', 'Low Orbit', 'LO', 140, 0, 'baa94b4f-4aad-1211-bdcf-949c18178820'),
  bloom: team('t-bloom', 'Static Bloom', 'SB', 320, 3, '2e2ca053-43d0-e2ed-8def-8e9e3fa366cb'),
};

export const ME = TEAMS.owls;
export const USER_ID = 'u-captain';

const RANK_FILES: Record<number, string> = {
  15: '15.c81298094a.webp', 18: '18.277e53d50b.webp', 21: '21.b174281275.webp', 24: '24.8f2db836f6.webp', 27: '27.a97b90f7df.webp',
  12: '12.ad5e66678a.webp', 9: '9.ce1194cf8f.webp',
};
const rankIcon = (n: number) => `/game-assets/valorant/ranks/${RANK_FILES[n]}`;

export const RANK_TIERS = [
  { key: 'silver', name: 'Silver', n: 9, sort: 3 },
  { key: 'gold', name: 'Gold', n: 12, sort: 4 },
  { key: 'platinum', name: 'Platinum', n: 15, sort: 5 },
  { key: 'diamond', name: 'Diamond', n: 18, sort: 6 },
  { key: 'ascendant', name: 'Ascendant', n: 21, sort: 7 },
  { key: 'immortal', name: 'Immortal', n: 24, sort: 8 },
  { key: 'radiant', name: 'Radiant', n: 27, sort: 9 },
].map((t) => ({
  id: `rt-${t.key}`, gameSlug: 'valorant', tierKey: t.key, displayName: t.name,
  sortOrder: t.sort, divisionCount: t.key === 'radiant' ? 1 : 3, iconUrl: rankIcon(t.n),
}));

export const rank = (key: string) => RANK_TIERS.find((t) => t.tierKey === key)!;

export const REGIONS = [
  { id: 'r-ap', gameSlug: 'valorant', regionKey: 'ap', displayName: 'Asia Pacific', serverIds: [] },
  { id: 'r-eu', gameSlug: 'valorant', regionKey: 'eu', displayName: 'Europe', serverIds: [] },
  { id: 'r-me', gameSlug: 'valorant', regionKey: 'me', displayName: 'Middle East', serverIds: [] },
];

export const VALORANT_GAME = {
  name: 'Valorant',
  slug: 'valorant',
  category: 'tactical-shooter',
  type: 'team',
  formats: [],
  defaultFormat: 'bo1',
  logo: '/games/valorant-logo.png',
  icon: '/games/valorant-logo.png',
  banner: null,
  features: { mapVeto: true, mapPool: true },
};

export function record(w: number, l: number, last5: Array<'W' | 'L' | 'D'>, streak: number, noShows = 0) {
  const completed = w + l;
  return {
    wins: w, losses: l, draws: 0, completed, noShows,
    showRate: completed ? completed / (completed + noShows) : null,
    lastPlayedAt: iso(-2 * DAY), last5, streak,
  };
}

export function members(names: string[], rankKey: string) {
  return names.map((username) => ({ username, avatar_seed: null, rank_tier_key: rankKey }));
}
