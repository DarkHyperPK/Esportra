/**
 * The match room for one whole scrim night, as a small state machine.
 * Our clicks in the real UI post to the API and the mock advances; the
 * capture script plays Crimson Five through `control` (check in, ban, confirm).
 */
import type { Route } from '../mockFetch';
import { DAY, MIN, ME, NOW, TEAMS, iso } from './common';
import { catalogRoutes } from './discovery';

const SESSION_ID = 's-crimson';
const VETO_TOKEN = 'veto-team1-token';
const OPP = TEAMS.crimson;
// The harness clock is fixed at Wed 20:47 PKT; the slot Night Owls booked starts at 21:00.
const MATCH_AT = NOW + 13 * MIN;

const MAP_IDS: Record<string, string> = {
  Ascent: '7eaecc1b-4337-bbf6-6ab9-04b8f06b3319', Bind: '2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba', Haven: '2bee0dc9-4ffe-519b-1cbd-7fbe763a6047',
  Lotus: '2fe4ed3a-450a-948b-6d6b-e89a78e680a9', Sunset: '92584fbe-486a-b1b2-9faa-39b0f486b498', Corrode: '1c18ab1f-420d-0d8b-71d0-77ad3c439115',
  Abyss: '224b0a95-48b9-f703-1bd8-67aca101a61f',
};
const POOL = Object.entries(MAP_IDS).map(([name, id]) => ({
  id, game: 'valorant', map_name: name, map_image_url: `https://media.valorant-api.com/maps/${id}/splash.png`,
}));
const mapName = (id: string) => POOL.find((m) => m.id === id)?.map_name ?? '';

const senders = {
  me: { id: 'u-captain', username: 'hex', full_name: 'Hex', avatar_url: null },
  opp: { id: 'u-vexa', username: 'vexa', full_name: 'Vexa', avatar_url: null },
};
const msg = (id: string, from: 'me' | 'opp', content: string, agoMin: number) => ({
  id, conversation_id: 'conv-1', sender_id: senders[from].id, content, message_type: 'text',
  is_edited: false, edited_at: null, created_at: iso(-agoMin * MIN), sender: senders[from],
});

const SEQ = [
  ['ban', 'T1'], ['ban', 'T2'], ['pick', 'T1'], ['pick', 'T2'], ['ban', 'T1'], ['ban', 'T2'], ['pick', 'T1'],
].map(([action, team], i) => ({ actionNumber: i + 1, action, team, isDecider: i === 6 }));

export function createRoom() {
  const s = {
    meIn: false,
    oppIn: false,
    lobby: null as string | null,
    messages: [msg('m2', 'opp', 'See you at 9. Ascent first?', 6), msg('m1', 'me', 'Booked. GG last week, run it back', 9)],
    team1Bans: [MAP_IDS.Abyss],
    team2Bans: [MAP_IDS.Corrode],
    actionNumber: 5,
    vetoDone: false,
    game1: null as null | { score: [number, number]; map: string; confirmed: boolean },
  };

  const live = () => s.meIn && s.oppIn;

  function session() {
    const g = s.game1;
    return {
      id: SESSION_ID, team1Id: ME.id, team2Id: OPP.id, gameSlug: 'valorant', modeKey: 'competitive',
      scheduledAt: new Date(MATCH_AT).toISOString(), durationMinutes: 120, serverInfo: null, lobbyCode: s.lobby,
      status: live() ? 'in_progress' : 'scheduled',
      resultReportedByTeam1: false, resultReportedByTeam2: false,
      team1Score: live() ? (g?.confirmed ? 1 : 0) : null, team2Score: live() ? 0 : null,
      team1CheckedInAt: s.meIn ? iso(-1 * MIN) : null, team2CheckedInAt: s.oppIn ? iso(0) : null,
      checkinWindowOpenedAt: new Date(MATCH_AT - 15 * MIN).toISOString(),
      vetoSessionId: live() ? 'veto-1' : null, vetoMyToken: live() ? VETO_TOKEN : null,
      dispute: null, myRole: 'captain', createdAt: iso(-DAY), updatedAt: iso(-MIN),
      team1Name: ME.name, team1Logo: ME.logo, team2Name: OPP.name, team2Logo: OPP.logo, bestOf: 3,
      timeProposal: null, timeClearRequest: null, cancelledReason: null, cancelledByTeamId: null,
    };
  }

  function vetoState() {
    const step = SEQ[Math.min(s.actionNumber, 7) - 1];
    return {
      id: 'veto-1', game: 'valorant', bestOf: 3, team1Name: ME.name, team2Name: OPP.name, team1Id: ME.id, team2Id: OPP.id,
      status: s.vetoDone ? 'completed' : 'in_progress',
      currentTeamId: s.vetoDone ? null : step.team === 'T1' ? ME.id : OPP.id,
      currentAction: s.vetoDone ? null : step.action, currentActionNumber: s.vetoDone ? 8 : s.actionNumber,
      team1BannedMaps: s.team1Bans, team2BannedMaps: s.team2Bans,
      team1PickedMaps: [{ mapId: MAP_IDS.Ascent, side: null }, ...(s.vetoDone ? [{ mapId: MAP_IDS.Sunset, side: null }] : [])],
      team2PickedMaps: [{ mapId: MAP_IDS.Lotus, side: 'attack' }],
      selectedMapId: s.vetoDone ? MAP_IDS.Sunset : null, maps: POOL, tossEnabled: false, sequence: SEQ, role: 'team1', expiresAt: iso(DAY),
      currentTeamSide: s.vetoDone ? null : step.team === 'T1' ? 'team1' : 'team2',
    };
  }

  function vetoHistory() {
    const rows: Array<Record<string, unknown> & { mapId: string }> = [
      { actionNumber: 1, teamName: ME.name, teamSide: 'team1', action: 'ban', mapId: MAP_IDS.Abyss },
      { actionNumber: 2, teamName: OPP.name, teamSide: 'team2', action: 'ban', mapId: MAP_IDS.Corrode },
      { actionNumber: 3, teamName: ME.name, teamSide: 'team1', action: 'pick', mapId: MAP_IDS.Ascent },
      { actionNumber: 4, teamName: OPP.name, teamSide: 'team2', action: 'pick', mapId: MAP_IDS.Lotus, side: 'attack' },
    ];
    if (s.team1Bans[1]) rows.push({ actionNumber: 5, teamName: ME.name, teamSide: 'team1', action: 'ban', mapId: s.team1Bans[1] });
    if (s.team2Bans[1]) rows.push({ actionNumber: 6, teamName: OPP.name, teamSide: 'team2', action: 'ban', mapId: s.team2Bans[1] });
    if (s.vetoDone) rows.push({ actionNumber: 7, teamName: ME.name, teamSide: 'team1', action: 'pick', mapId: MAP_IDS.Sunset });
    return rows.map((r) => ({ ...r, mapName: mapName(r.mapId), createdAt: iso(-MIN) }));
  }

  function game1Raw() {
    const g = s.game1;
    if (!g) return null;
    return {
      game_number: 1, status: g.confirmed ? 'confirmed' : 'reported', map_name: g.map, map_id: null,
      team1_score: g.score[0], team2_score: g.score[1], winner_slot: g.confirmed ? 1 : null, source: 'manual', riot_match_id: null,
      match_data: null, screenshot_urls: [], notes: null, reported_by_team_id: ME.id, reported_at: iso(0),
      confirmed_by_team_id: g.confirmed ? OPP.id : null, confirmed_at: g.confirmed ? iso(0) : null, disputed_by_team_id: null,
      accept_by: iso(30 * MIN), auto_confirmed: false,
    };
  }

  function games() {
    const g1 = game1Raw();
    const won = s.game1?.confirmed ? 1 : 0;
    return { best_of: 3, wins_needed: 2, team1_wins: won, team2_wins: 0, next_game_number: won ? 2 : 1, games: g1 ? [g1] : [] };
  }

  const body = (init?: RequestInit) => JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;

  const routes: Route[] = [
    ...catalogRoutes,
    [/^\/api\/scrims\/sessions\/[^/]+$/, () => session()],
    [/^\/api\/scrims\/sessions\/[^/]+\/checkin/, () => { s.meIn = true; return session(); }],
    [/^\/api\/scrims\/sessions\/[^/]+\/lobby/, (_u, init) => { const b = body(init); s.lobby = String(b.lobbyCode ?? b.lobby_code ?? '') || s.lobby; return session(); }],
    [/^\/api\/scrims\/sessions\/[^/]+\/games$/, () => games()],
    [/^\/api\/scrims\/sessions\/[^/]+\/games\/\d+\/provider-match/, () => null],
    [/^\/api\/scrims\/sessions\/[^/]+\/games\/\d+(\/report)?$/, (_u, init) => {
      const b = body(init);
      s.game1 = { score: [Number(b.team1_score ?? 13), Number(b.team2_score ?? 9)], map: String(b.map_name ?? 'Ascent'), confirmed: false };
      return game1Raw();
    }],
    [/^\/api\/scrims\/sessions\/[^/]+\/conversation/, () => ({ conversation_id: 'conv-1' })],
    [/^\/api\/scrims\/up-next/, () => ({ items: [], total: 0 })],
    [/^\/api\/conversations$/, () => []],
    [/^\/api\/conversations\/[^/]+\/messages\?/, () => s.messages],
    [/^\/api\/conversations\/[^/]+\/messages$/, (_u, init) => {
      const m = msg(`m${s.messages.length + 1}`, 'me', String(body(init).content ?? ''), 0);
      s.messages = [m, ...s.messages];
      return m;
    }],
    [/^\/api\/conversations\/[^/]+\/read/, () => ({})],
    [/^\/api\/tools\/map-veto\/team\/[^/]+\/ban/, (_u, init) => {
      const id = String(body(init).mapId ?? '');
      if (id) s.team1Bans = [...s.team1Bans, id];
      s.actionNumber = 6;
      return vetoState();
    }],
    [/^\/api\/tools\/map-veto\/team\/[^/]+\/pick/, () => { s.vetoDone = true; return vetoState(); }],
    [/^\/api\/tools\/map-veto\/team\/[^/]+$/, () => vetoState()],
    [/^\/api\/tools\/map-veto\/[^/]+\/history/, () => vetoHistory()],
    [/^\/hubs\//, () => ({ error: 'no realtime in the harness' })],
  ];

  /** Crimson Five's side of the night, played by the capture script. */
  const control = {
    oppCheckIn: () => { s.oppIn = true; },
    oppBan: () => { s.team2Bans = [...s.team2Bans, MAP_IDS.Bind]; s.actionNumber = 7; },
    decider: () => { s.vetoDone = true; },
    oppConfirm: () => { if (s.game1) s.game1 = { ...s.game1, confirmed: true }; },
  };

  return { routes, control, session };
}

export const ROOM_SESSION_ID = SESSION_ID;
