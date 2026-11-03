/**
 * Match room fixtures with a small state machine: a real click in the real UI
 * (accept time, check in, ban a map, auto-fetch a map) posts to the API, the
 * mock advances the state, and the page re-renders from the refetch.
 */
import type { Route } from '../mockFetch';
import { DAY, HOUR, MIN, ME, NOW, TEAMS, iso } from './common';
import { catalogRoutes } from './discovery';

export type RoomStage = 'time' | 'checkin' | 'veto' | 'report';

const SESSION_ID = 's-crimson';
const VETO_TOKEN = 'veto-team1-token';
const OPP = TEAMS.crimson;
// The harness clock is fixed at Wed 20:47 PKT, so the match starts at 21:00.
const MATCH_AT = NOW + 13 * MIN;

const MAP_IDS: Record<string, string> = {
  Ascent: '7eaecc1b-4337-bbf6-6ab9-04b8f06b3319', Bind: '2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba', Haven: '2bee0dc9-4ffe-519b-1cbd-7fbe763a6047',
  Lotus: '2fe4ed3a-450a-948b-6d6b-e89a78e680a9', Sunset: '92584fbe-486a-b1b2-9faa-39b0f486b498', Corrode: '1c18ab1f-420d-0d8b-71d0-77ad3c439115',
  Abyss: '224b0a95-48b9-f703-1bd8-67aca101a61f',
};
const POOL = Object.entries(MAP_IDS).map(([name, id]) => ({
  id, game: 'valorant', map_name: name, map_image_url: `https://media.valorant-api.com/maps/${id}/splash.png`,
}));

const msg = (id: string, from: 'me' | 'opp', content: string, agoMin: number) => ({
  id, conversation_id: 'conv-1', sender_id: from === 'me' ? 'u-captain' : 'u-vexa', content, message_type: 'text',
  is_edited: false, edited_at: null, created_at: iso(-agoMin * MIN),
  sender: from === 'me' ? { id: 'u-captain', username: 'hex', full_name: 'Hex', avatar_url: null } : { id: 'u-vexa', username: 'vexa', full_name: 'Vexa', avatar_url: null },
});
const MESSAGES = [
  msg('m3', 'opp', 'gl hf. lobby in 5', 2),
  msg('m2', 'me', 'Locked. Sending the party code when we load in', 6),
  msg('m1', 'opp', 'Ascent first? We pick Lotus for map 2', 9),
];

export function createRoom(stage: RoomStage) {
  const s = {
    stage,
    proposalStatus: 'pending' as 'pending' | 'accepted',
    meIn: stage === 'veto' || stage === 'report',
    oppIn: stage !== 'time',
    team1Bans: [MAP_IDS.Abyss] as string[],
    team2Bans: [MAP_IDS.Corrode] as string[],
    actionNumber: 5,
    reported: false,
  };

  const scheduled = stage !== 'time' || s.proposalStatus === 'accepted';

  function session() {
    const live = s.meIn && s.oppIn;
    const hasTime = s.stage !== 'time' || s.proposalStatus === 'accepted';
    return {
      id: SESSION_ID, team1Id: ME.id, team2Id: OPP.id, gameSlug: 'valorant', modeKey: 'competitive',
      scheduledAt: hasTime ? new Date(MATCH_AT).toISOString() : null, durationMinutes: 120,
      serverInfo: 'Mumbai', lobbyCode: live ? 'NO-C5-7Q4K' : null,
      status: live ? 'in_progress' : 'scheduled',
      resultReportedByTeam1: false, resultReportedByTeam2: false,
      team1Score: live ? (s.reported ? 1 : 0) : null, team2Score: live ? 0 : null,
      team1CheckedInAt: s.meIn ? iso(-2 * MIN) : null, team2CheckedInAt: s.oppIn ? iso(-4 * MIN) : null,
      checkinWindowOpenedAt: hasTime ? new Date(MATCH_AT - 15 * MIN).toISOString() : null,
      vetoSessionId: live ? 'veto-1' : null, vetoMyToken: live ? VETO_TOKEN : null,
      dispute: null, myRole: 'captain', createdAt: iso(-DAY), updatedAt: iso(-MIN),
      team1Name: ME.name, team1Logo: ME.logo, team2Name: OPP.name, team2Logo: OPP.logo, bestOf: 3,
      timeProposal: s.stage === 'time' && s.proposalStatus === 'pending' ? {
        id: 'tp-1', sessionId: SESSION_ID, proposedByTeamId: OPP.id, proposedAt: new Date(NOW + DAY + 13 * MIN).toISOString(),
        note: 'Tomorrow at 9, right after our block?', status: 'pending', createdAt: iso(-20 * MIN),
      } : null,
      timeClearRequest: null, cancelledReason: null, cancelledByTeamId: null,
    };
  }

  function vetoState() {
    const seq = [
      ['ban', 'T1'], ['ban', 'T2'], ['pick', 'T1'], ['pick', 'T2'], ['ban', 'T1'], ['ban', 'T2'], ['pick', 'T1'],
    ].map(([action, team], i) => ({ actionNumber: i + 1, action, team, isDecider: i === 6 }));
    const step = seq[s.actionNumber - 1];
    return {
      id: 'veto-1', game: 'valorant', bestOf: 3, team1Name: ME.name, team2Name: OPP.name, team1Id: ME.id, team2Id: OPP.id,
      status: 'in_progress', currentTeamId: step.team === 'T1' ? ME.id : OPP.id, currentAction: step.action, currentActionNumber: s.actionNumber,
      team1BannedMaps: s.team1Bans, team2BannedMaps: s.team2Bans,
      team1PickedMaps: [{ mapId: MAP_IDS.Ascent, side: null }], team2PickedMaps: [{ mapId: MAP_IDS.Lotus, side: 'attack' }],
      selectedMapId: null, maps: POOL, tossEnabled: false, sequence: seq, role: 'team1', expiresAt: iso(DAY),
      currentTeamSide: step.team === 'T1' ? 'team1' : 'team2',
    };
  }

  function vetoHistory() {
    const name = (id: string) => POOL.find((m) => m.id === id)?.map_name ?? '';
    const rows = [
      { actionNumber: 1, teamName: ME.name, teamSide: 'team1', action: 'ban', mapId: MAP_IDS.Abyss },
      { actionNumber: 2, teamName: OPP.name, teamSide: 'team2', action: 'ban', mapId: MAP_IDS.Corrode },
      { actionNumber: 3, teamName: ME.name, teamSide: 'team1', action: 'pick', mapId: MAP_IDS.Ascent },
      { actionNumber: 4, teamName: OPP.name, teamSide: 'team2', action: 'pick', mapId: MAP_IDS.Lotus, side: 'attack' },
      ...s.team1Bans.slice(1).map((id, i) => ({ actionNumber: 5 + i * 2, teamName: ME.name, teamSide: 'team1', action: 'ban', mapId: id })),
    ];
    return rows.map((r) => ({ ...r, mapName: name(r.mapId), createdAt: iso(-MIN) }));
  }

  function games() {
    const game1 = s.reported ? [{
      game_number: 1, status: 'reported', map_name: 'Ascent', map_id: MAP_IDS.Ascent, team1_score: 13, team2_score: 9, winner_slot: 1,
      source: 'riot', riot_match_id: 'riot-ascent-1', match_data: null, screenshot_urls: [], notes: null,
      reported_by_team_id: ME.id, reported_at: iso(0), confirmed_by_team_id: null, confirmed_at: null, disputed_by_team_id: null,
      accept_by: iso(30 * MIN), auto_confirmed: false,
    }] : [];
    return { best_of: 3, wins_needed: 2, team1_wins: s.reported ? 1 : 0, team2_wins: 0, next_game_number: s.reported ? 2 : 1, games: game1 };
  }

  const candidate = {
    id: 'riot-ascent-1', map: 'Ascent', mapId: '/Game/Maps/Ascent/Ascent', queueId: 'custom', startTime: NOW - 4 * MIN - 38 * MIN,
    gameLengthMillis: 38 * MIN + 12_000, myTeamScore: 13, enemyTeamScore: 9, reporterSide: 'Blue', score: '13-9', result: 'Victory',
    kda: '21/14/6', agent: '8e253930-4c05-31dd-1b6c-968525494517', isExpectedMap: true, blueTeam: { roundsWon: 13, won: true }, redTeam: { roundsWon: 9, won: false },
    players: [], matchInfo: { mapId: '/Game/Maps/Ascent/Ascent', gameMode: 'custom', region: 'ap', isRanked: false },
  };
  const olderCandidate = { ...candidate, id: 'riot-ascent-0', startTime: NOW - 3 * HOUR, myTeamScore: 8, enemyTeamScore: 13, score: '8-13', result: 'Defeat', kda: '12/17/4', isExpectedMap: true, blueTeam: { roundsWon: 8, won: false }, redTeam: { roundsWon: 13, won: true } };

  const routes: Route[] = [
    ...catalogRoutes,
    [/^\/api\/scrims\/sessions\/[^/]+$/, () => session()],
    [/^\/api\/scrims\/time-proposals\/[^/]+\/accept/, () => { s.proposalStatus = 'accepted'; s.stage = 'checkin'; return { scheduledAt: new Date(MATCH_AT).toISOString() }; }],
    [/^\/api\/scrims\/sessions\/[^/]+\/checkin/, () => { s.meIn = true; return session(); }],
    [/^\/api\/scrims\/sessions\/[^/]+\/games$/, (_u, init) => {
      if (init?.method === 'POST') { s.reported = true; return games().games[0]; }
      return games();
    }],
    [/^\/api\/scrims\/sessions\/[^/]+\/games\/\d+(\/report)?$/, () => { s.reported = true; return games().games[0]; }],
    [/^\/api\/scrims\/sessions\/[^/]+\/recent-matches/, () => ({ matches: [candidate, olderCandidate], expected_map: 'Ascent', hidden_by_veto: 1 })],
    [/^\/api\/integrations\/riot\/enriched-match/, () => ({})],
    [/^\/api\/scrims\/sessions\/[^/]+\/conversation/, () => ({ conversation_id: 'conv-1' })],
    [/^\/api\/scrims\/up-next/, () => ({ items: [], total: 0 })],
    [/^\/api\/tools\/map-veto\/team\/[^/]+\/ban/, (_u, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { mapId?: string };
      if (body.mapId) s.team1Bans = [...s.team1Bans, body.mapId];
      s.actionNumber = 6;
      return vetoState();
    }],
    [/^\/api\/tools\/map-veto\/team\/[^/]+$/, () => vetoState()],
    [/^\/api\/tools\/map-veto\/[^/]+\/history/, () => vetoHistory()],
    [/^\/api\/conversations$/, () => []],
    [/^\/api\/conversations\/[^/]+\/messages/, () => MESSAGES],
    [/^\/api\/conversations\/[^/]+\/read/, () => ({})],
  ];
  void scheduled;
  return { routes, session, vetoState, sessionId: SESSION_ID };
}

export const ROOM_SESSION_ID = SESSION_ID;
