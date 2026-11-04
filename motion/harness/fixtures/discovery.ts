import type { Route } from '../mockFetch';
import { DAY, HOUR, ME, NOW, REGIONS, RANK_TIERS, TEAMS, iso, members, rank, record, type SampleTeam } from './common';

function listing(id: string, t: SampleTeam, o: {
  region: string; min: string; max: string; days: number[]; start: string; end: string;
  rec: ReturnType<typeof record>; roster: string[]; rosterRank: string; played: number; ageH: number; notes?: string;
}) {
  const min = rank(o.min);
  const max = rank(o.max);
  return {
    id, teamId: t.id, gameSlug: 'valorant', modeKey: 'competitive', regionKey: o.region,
    minRankKey: o.min, maxRankKey: o.max, preferredDays: o.days,
    preferredTimeStart: o.start, preferredTimeEnd: o.end, timezone: 'Asia/Karachi',
    notes: o.notes ?? null, status: 'open', scheduleType: 'recurring', scheduleUntil: null,
    slotDurationMinutes: 120, bestOf: 3, createdAt: iso(-o.ageH * HOUR), updatedAt: iso(-o.ageH * HOUR),
    teamName: t.name, teamLogoUrl: t.logo, teamTag: t.tag, activeMemberCount: o.roster.length,
    minRankDisplayName: min.displayName, minRankIconUrl: min.iconUrl,
    maxRankDisplayName: max.displayName, maxRankIconUrl: max.iconUrl,
    membersPreview: members(o.roster, o.rosterRank), scrimsCompleted: o.played,
    record: o.rec, captainCardUrl: t.card,
  };
}

export function discoveryListings() {
  return [
    listing('l-crimson', TEAMS.crimson, {
      region: 'ap', min: 'diamond', max: 'immortal', days: [1, 3, 5], start: '20:00', end: '23:00',
      rec: record(14, 5, ['W', 'W', 'L', 'W', 'W'], 2), roster: ['Vexa', 'Rook', 'Sable', 'Juno', 'Kite'], rosterRank: 'immortal',
      played: 19, ageH: 2, notes: 'Bo3, scrims every MWF. Bring your best comps.',
    }),
    listing('l-neon', TEAMS.neon, {
      region: 'ap', min: 'ascendant', max: 'immortal', days: [2, 4, 6], start: '21:00', end: '23:30',
      rec: record(11, 7, ['W', 'L', 'W', 'W', 'L'], -1), roster: ['Halo', 'Mint', 'Orca', 'Pax', 'Zed'], rosterRank: 'ascendant',
      played: 18, ageH: 5,
    }),
    listing('l-tigers', TEAMS.tigers, {
      region: 'me', min: 'platinum', max: 'diamond', days: [0, 6], start: '18:00', end: '21:00',
      rec: record(9, 9, ['L', 'W', 'W', 'L', 'W'], 1), roster: ['Ashe', 'Bolt', 'Cyra', 'Dune'], rosterRank: 'diamond',
      played: 18, ageH: 9,
    }),
    listing('l-orbit', TEAMS.orbit, {
      region: 'ap', min: 'diamond', max: 'ascendant', days: [1, 2, 3, 4], start: '19:00', end: '22:00',
      rec: record(7, 3, ['W', 'W', 'W', 'L', 'W'], 3), roster: ['Nova', 'Echo', 'Frost', 'Gale', 'Ivy'], rosterRank: 'ascendant',
      played: 10, ageH: 20,
    }),
    listing('l-bloom', TEAMS.bloom, {
      region: 'eu', min: 'immortal', max: 'radiant', days: [5, 6], start: '22:00', end: '23:59',
      rec: record(21, 6, ['W', 'W', 'W', 'W', 'L'], 4), roster: ['Lux', 'Moth', 'Nyx', 'Onyx', 'Pike'], rosterRank: 'immortal',
      played: 27, ageH: 30,
    }),
    listing('l-own', ME, {
      region: 'ap', min: 'diamond', max: 'immortal', days: [1, 3, 5], start: '20:00', end: '23:00',
      rec: record(12, 6, ['W', 'L', 'W', 'W', 'W'], 3), roster: ['Hex', 'Raze', 'Kilo', 'Mara', 'Tide'], rosterRank: 'immortal',
      played: 18, ageH: 40,
    }),
  ];
}

export const myTeams = () => [{ id: ME.id, name: ME.name, tag: ME.tag, logo_url: ME.logo, primary_game_slug: 'valorant', role: 'captain' }];

export function upNext(type: 'checkin_open' | 'time_to_respond' | 'offer_received' = 'checkin_open') {
  return {
    items: [{
      type, teamId: ME.id, sessionId: 's-crimson', offerId: null, listingId: null,
      opponentName: TEAMS.crimson.name, opponentLogo: TEAMS.crimson.logo, gameSlug: 'valorant',
      scheduledAt: new Date(NOW + 25 * 60_000).toISOString(), deadline: new Date(NOW + 14 * 60_000 + 32_000).toISOString(),
    }],
    total: 3,
  };
}

export const catalogRoutes: Route[] = [
  [/^\/api\/catalog\/rank-tiers/, () => RANK_TIERS],
  [/^\/api\/catalog\/regions/, () => REGIONS],
  [/^\/api\/catalog\/game-roles/, () => []],
  [/^\/api\/teams\/me/, () => myTeams()],
];

function slotsFor(listingId: string) {
  // Next week's evenings at 20:00 and 22:00 Pakistan time (UTC+5), two hours each.
  const out = [];
  const base = new Date(NOW);
  base.setUTCHours(15, 0, 0, 0);
  out.push({
    id: 'slot-tonight', listingId, startsAt: new Date(base.getTime() + HOUR).toISOString(), endsAt: new Date(base.getTime() + 3 * HOUR).toISOString(),
    status: 'available', createdAt: iso(-DAY), bookedByTeamId: null,
  });
  for (let d = 1; d <= 5; d += 1) {
    for (const h of [0, 2]) {
      const start = new Date(base.getTime() + d * DAY + h * HOUR);
      const booked = (d === 2 && h === 0) || (d === 4 && h === 2);
      out.push({
        id: `slot-${d}-${h}`, listingId, startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 2 * HOUR).toISOString(),
        status: booked ? 'booked' : 'available', createdAt: iso(-DAY), bookedByTeamId: booked ? TEAMS.neon.id : null,
      });
    }
  }
  return out;
}

const DETAIL_MEMBERS = [
  { username: 'Vexa', role: 'captain', rank: 'immortal', tier: 25, wr: 0.61, kd: 1.32, hs: 0.29, card: '83bffdf0-4aa8-bcf4-7e32-a5a508cbd0f0' },
  { username: 'Rook', role: 'player', rank: 'immortal', tier: 24, wr: 0.58, kd: 1.18, hs: 0.26 },
  { username: 'Sable', role: 'player', rank: 'ascendant', tier: 23, wr: 0.55, kd: 1.09, hs: 0.31 },
  { username: 'Juno', role: 'player', rank: 'immortal', tier: 24, wr: 0.57, kd: 1.04, hs: 0.22 },
  { username: 'Kite', role: 'player', rank: 'diamond', tier: 20, wr: 0.52, kd: 0.97, hs: 0.24 },
];

export function listingDetail(id: string) {
  const listing = discoveryListings().find((l) => l.id === id) ?? discoveryListings()[0];
  return {
    listing,
    members: DETAIL_MEMBERS.map((m) => ({
      username: m.username, avatarSeed: null, avatarStyle: null, role: m.role,
      rankTierKey: m.rank, rankDisplayName: rank(m.rank).displayName, rankIconUrl: rank(m.rank).iconUrl,
      competitiveTier: m.tier, competitiveTierName: rank(m.rank).displayName,
      winRate: m.wr, kdRatio: m.kd, hsPct: m.hs, playerCardId: m.card ?? null,
    })),
    slots: slotsFor(listing.id),
  };
}

export function teamHistory(teamId: string) {
  const opp = [TEAMS.neon, TEAMS.tigers, TEAMS.orbit, TEAMS.bloom, TEAMS.neon];
  const scores: Array<[number, number, string]> = [[2, 1, 'Ascent'], [2, 0, 'Lotus'], [1, 2, 'Bind'], [2, 1, 'Haven'], [2, 0, 'Sunset']];
  return {
    items: opp.map((o, i) => ({
      id: `h-${i}`, scheduledAt: iso(-(i + 1) * 2 * DAY), gameSlug: 'valorant', team1Id: teamId, team1Name: 'Crimson Five',
      team2Id: o.id, team2Name: o.name, team1Score: scores[i][0], team2Score: scores[i][1], mapName: scores[i][2],
      completedAt: iso(-(i + 1) * 2 * DAY),
    })),
    total: 19, page: 1, pageSize: 5,
  };
}

export const discoveryRoutes: Route[] = [
  ...catalogRoutes,
  [/^\/api\/scrims\/discover/, (u) => {
    const region = u.searchParams.get('region_key');
    const min = Number(u.searchParams.get('min_rank_sort_order') ?? 0);
    return discoveryListings().filter((l) => (!region || l.regionKey === region) && (!min || (rank(l.maxRankKey ?? '').sortOrder >= min)));
  }],
  [/^\/api\/scrims\/listings\/[^/]+\/offer$/, (u) => ({
    id: 'offer-1', listingId: u.pathname.split('/')[4], offeringTeamId: ME.id, status: 'pending', proposedAt: null,
    proposedDurationMinutes: 120, notes: null, createdAt: iso(0), updatedAt: iso(0),
  })],
  [/^\/api\/scrims\/listings\/[^/]+\/detail/, (u) => listingDetail(u.pathname.split('/')[4])],
  [/^\/api\/scrims\/teams\/[^/]+\/history\?/, (u) => teamHistory(u.pathname.split('/')[4])],
  [/^\/api\/scrims\/up-next/, () => upNext()],
];

export { DAY };
