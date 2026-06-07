import { expect } from '@playwright/test';
import type { ApiClient } from './api';
import { defaultBrDates } from './brSetup';

export type GameMapRow = { id: string; map_name: string; map_image_url?: string | null };

export type VetoState = {
  id: string;
  matchId?: string;
  match_id?: string;
  status: string;
  currentAction?: string | null;
  current_action?: string | null;
  currentActionNumber?: number;
  current_action_number?: number;
  currentTeamId?: string | null;
  current_team_id?: string | null;
  bestOf?: number;
  best_of?: number;
  game?: string;
};

export type VetoHistoryEntry = {
  actionNumber: number;
  teamSide: 'team1' | 'team2';
  teamName?: string;
  action: string;
  mapId: string;
  mapName?: string;
  side?: 'attack' | 'defend' | null;
};

export type VetoMatchFixture = {
  tournamentId: string;
  slug: string;
  stageId: string;
  versionId: string;
  matchId: string;
  team1Id: string;
  team2Id: string;
  mapPoolIds: string[];
  game: string;
  bestOf: 1 | 3 | 5;
};

type ParticipantRow = {
  team_id?: string;
  teamId?: string;
  id?: string;
  team_name?: string;
  teamName?: string;
  teams?: { name?: string };
};

type BracketMatchRow = {
  id: string;
  team1_id?: string | null;
  team1Id?: string | null;
  team2_id?: string | null;
  team2Id?: string | null;
  round_index?: number;
  match_number?: number;
};

function dbGameName(game: string): string {
  if (game.toLowerCase() === 'cs2' || game.toLowerCase() === 'counter-strike 2') {
    return 'Counter-Strike 2';
  }
  return game;
}

export async function fetchGameMaps(client: ApiClient, game: string): Promise<GameMapRow[]> {
  const name = dbGameName(game);
  return client.get<GameMapRow[]>(`/api/games/maps?game=${encodeURIComponent(name)}`);
}

export async function buildMapPoolIds(
  client: ApiClient,
  game: string,
  requiredCount: number,
): Promise<string[]> {
  const maps = await fetchGameMaps(client, game);
  expect(maps.length).toBeGreaterThanOrEqual(requiredCount);
  return maps.slice(0, requiredCount).map((row) => row.id);
}

export async function getVetoState(client: ApiClient, matchId: string): Promise<VetoState | null> {
  const cleanedId = matchId.replace(/^(db-|wb-|lb-)/, '');
  const { status, body } = await client.request('GET', `/api/veto/${cleanedId}`);
  if (status === 404) return null;
  if (!status || status >= 400) {
    throw new Error(`GET /api/veto/${cleanedId} failed (${status}): ${body}`);
  }
  return JSON.parse(body) as VetoState;
}

export async function getVetoHistory(client: ApiClient, matchId: string): Promise<VetoHistoryEntry[]> {
  const cleanedId = matchId.replace(/^(db-|wb-|lb-)/, '');
  const data = await client.get<unknown>(`/api/veto/${cleanedId}/history`);
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { actions?: unknown[] })?.actions)
      ? (data as { actions: unknown[] }).actions
      : [];
  return rows as VetoHistoryEntry[];
}

export async function initVeto(
  client: ApiClient,
  matchId: string,
  body: {
    tournamentId: string;
    team1Id: string;
    team2Id: string;
    bestOf: number;
    game: string;
  },
): Promise<VetoState> {
  const cleanedId = matchId.replace(/^(db-|wb-|lb-)/, '');
  return client.post<VetoState>(`/api/veto/${cleanedId}/init`, body);
}

export async function banMap(client: ApiClient, matchId: string, mapId: string): Promise<VetoState> {
  const cleanedId = matchId.replace(/^(db-|wb-|lb-)/, '');
  return client.post<VetoState>(`/api/veto/${cleanedId}/ban`, { mapId });
}

export async function pickMap(client: ApiClient, matchId: string, mapId: string): Promise<VetoState> {
  const cleanedId = matchId.replace(/^(db-|wb-|lb-)/, '');
  const stateBefore = await getVetoState(client, matchId);
  const { status, body } = await client.request('POST', `/api/veto/${cleanedId}/pick`, { mapId });
  if (!status || status >= 400) {
    throw new Error(
      `POST /api/veto/${cleanedId}/pick failed (${status}): ${body}. `
      + `mapId=${mapId} vetoState=${JSON.stringify(stateBefore)}`,
    );
  }
  return JSON.parse(body) as VetoState;
}

export async function pickSide(
  client: ApiClient,
  matchId: string,
  mapId: string,
  side: 'attack' | 'defend',
): Promise<VetoState> {
  const cleanedId = matchId.replace(/^(db-|wb-|lb-)/, '');
  return client.post<VetoState>(`/api/veto/${cleanedId}/pick-side`, { mapId, side });
}

export async function resetVeto(client: ApiClient, matchId: string): Promise<void> {
  const cleanedId = matchId.replace(/^(db-|wb-|lb-)/, '');
  await client.post(`/api/veto/${cleanedId}/reset`, {});
}

export async function registerTeam(
  captain: ApiClient,
  tournamentId: string,
  teamId: string,
  rosterId: string,
): Promise<void> {
  await captain.post(`/api/tournaments/${tournamentId}/register`, {
    teamId,
    rosterId,
  });
}

async function closeRegistration(organizer: ApiClient, tournamentId: string): Promise<void> {
  const now = Date.now();
  await organizer.put(`/api/tournaments/${tournamentId}`, {
    registrationDeadline: new Date(now - 7_200_000).toISOString(),
    startDate: new Date(now - 3_600_000).toISOString(),
    status: 'ongoing',
  });
}

export async function setupMapVetoMatchFixture(
  organizer: ApiClient,
  options: {
    game: 'Valorant' | 'Rainbow Six Siege';
    bestOf?: 1 | 3 | 5;
    mapPoolSize?: number;
    stamp?: number;
  },
): Promise<VetoMatchFixture> {
  const stamp = options.stamp ?? Date.now();
  const game = options.game;
  const bestOf = options.bestOf ?? 1;
  const mapPoolSize = options.mapPoolSize ?? (game === 'Rainbow Six Siege' ? 9 : 7);
  const dates = defaultBrDates();

  const mapPoolIds = await buildMapPoolIds(organizer, game, mapPoolSize);

  const tournament = await organizer.post<{ id: string; slug: string }>('/api/tournaments', {
    name: `E2E Veto ${game} ${stamp}`,
    slug: `e2e-veto-${game.toLowerCase().replace(/\s+/g, '-')}-${stamp}`,
    game,
    gameMode: '5v5',
    teamSize: 5,
    maxTeams: 8,
    tournamentType: 'single_elimination',
    mapPoolIds,
    settings: { mapVetoEnabled: true },
    startDate: dates.startDate,
    endDate: dates.endDate,
    registrationDeadline: dates.registrationDeadline,
    status: 'open',
    isPublic: true,
    checkInRequired: false,
  });

  let stages = await organizer.get<Array<{ id: string; best_of?: number; bestOf?: number }>>(
    `/api/tournaments/${tournament.id}/stages`,
  );
  if (!stages?.length) {
    await organizer.put(`/api/tournaments/${tournament.id}/stages`, {
      stages: [{
        name: 'Playoffs',
        format: 'single_elimination',
        stageOrder: 1,
        bestOf,
        capacity: 8,
      }],
    });
    stages = await organizer.get(`/api/tournaments/${tournament.id}/stages`);
  } else if (bestOf !== 1) {
    await organizer.put(`/api/tournaments/${tournament.id}/stages`, {
      stages: stages.map((stage, index) => ({
        id: stage.id,
        name: 'Playoffs',
        format: 'single_elimination',
        stageOrder: index + 1,
        bestOf,
      })),
    });
  }

  const stageId = stages[0]?.id;
  if (!stageId) throw new Error('Veto fixture: tournament has no stage');

  await organizer.post(`/api/tournaments/${tournament.id}/mock/generate`, { count: 2 });

  await closeRegistration(organizer, tournament.id);

  const participants = await organizer.get<ParticipantRow[]>(
    `/api/tournaments/${tournament.id}/participants`,
  );
  const teams = (participants ?? [])
    .map((row) => {
      const id = row.team_id ?? row.teamId;
      if (!id) return null;
      return {
        id,
        name: row.teams?.name ?? row.team_name ?? row.teamName ?? 'Team',
      };
    })
    .filter((row): row is { id: string; name: string } => row !== null);

  expect(teams.length).toBeGreaterThanOrEqual(2);

  const bracket = await organizer.post<{ versionId: string }>('/api/brackets/generate', {
    tournamentId: tournament.id,
    stageId,
    format: 'single_elimination',
    teams,
    bestOf,
    bracketSize: Math.max(teams.length, 2),
  });

  const matches = await organizer.get<BracketMatchRow[]>(
    `/api/brackets/matches?versionId=${bracket.versionId}`,
  );
  const playable = (matches ?? []).find((match) => {
    const team1 = match.team1_id ?? match.team1Id;
    const team2 = match.team2_id ?? match.team2Id;
    return team1 && team2;
  });
  if (!playable?.id) throw new Error('Veto fixture: no bracket match with two teams');

  const team1Id = playable.team1_id ?? playable.team1Id;
  const team2Id = playable.team2_id ?? playable.team2Id;

  await organizer.post(`/api/matches/${playable.id}/go-live`, { partyCode: 'E2EVETO' });

  return {
    tournamentId: tournament.id,
    slug: tournament.slug,
    stageId,
    versionId: bracket.versionId,
    matchId: playable.id,
    team1Id: team1Id as string,
    team2Id: team2Id as string,
    mapPoolIds,
    game,
    bestOf,
  };
}

function resolveMapId(
  mapPoolIds: string[],
  usedIds: Set<string>,
  mapsById: Map<string, GameMapRow>,
): string {
  const next = mapPoolIds.find((id) => !usedIds.has(id));
  if (!next) throw new Error('No remaining maps in pool for veto action');
  usedIds.add(next);
  return next;
}

function currentAction(state: VetoState): string | null {
  return state.currentAction ?? state.current_action ?? null;
}

export async function completeVetoViaApi(
  actor: ApiClient,
  fixture: VetoMatchFixture,
): Promise<VetoState> {
  const maps = await fetchGameMaps(actor, fixture.game);
  const mapsById = new Map(maps.map((row) => [row.id, row]));
  const used = new Set<string>();

  await initVeto(actor, fixture.matchId, {
    tournamentId: fixture.tournamentId,
    team1Id: fixture.team1Id,
    team2Id: fixture.team2Id,
    bestOf: fixture.bestOf,
    game: fixture.game,
  });

  let state: VetoState | null = null;
  let guard = 0;
  let lastPickedMapId: string | null = null;

  while (guard++ < 40) {
    state = await getVetoState(actor, fixture.matchId);
    if (!state) throw new Error('Veto state missing during completion loop');
    if (state.status === 'completed') break;
    expect(state.status).toBe('in_progress');

    const action = currentAction(state);
    if (!action) throw new Error('Veto in progress but current action is missing');

    if (action === 'ban' || action === 'pick') {
      const mapId = resolveMapId(fixture.mapPoolIds, used, mapsById);
      state = action === 'ban'
        ? await banMap(actor, fixture.matchId, mapId)
        : await pickMap(actor, fixture.matchId, mapId);
      if (action === 'pick') lastPickedMapId = mapId;
      continue;
    }

    if (action === 'pick_side') {
      const mapId = lastPickedMapId
        ?? fixture.mapPoolIds.find((id) => !used.has(id))
        ?? fixture.mapPoolIds[fixture.mapPoolIds.length - 1];
      if (!lastPickedMapId) used.add(mapId);
      lastPickedMapId = null;
      state = await pickSide(actor, fixture.matchId, mapId, 'attack');
    }
  }

  expect(state?.status).toBe('completed');
  return state!;
}

export async function completeBo1VetoViaApi(
  actor: ApiClient,
  fixture: VetoMatchFixture,
): Promise<VetoState> {
  return completeVetoViaApi(actor, { ...fixture, bestOf: 1 });
}

export async function waitForStagingVetoReady(
  apiUrl: string,
  options?: { timeoutMs?: number; intervalMs?: number },
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 600_000;
  const intervalMs = options?.intervalMs ?? 15_000;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const mapsRes = await fetch(
        `${apiUrl.replace(/\/$/, '')}/api/games/maps?game=${encodeURIComponent('Rainbow Six Siege')}`,
      );
      if (mapsRes.ok) {
        const maps = (await mapsRes.json()) as unknown[];
        if (Array.isArray(maps) && maps.length >= 9) return;
      }

      const catalogRes = await fetch(
        `${apiUrl.replace(/\/$/, '')}/api/games/catalog/r6`,
      );
      if (catalogRes.ok) return;
    } catch {
      // keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Staging veto prerequisites not ready after ${timeoutMs}ms (R6 catalog/maps missing).`,
  );
}

export async function waitForVetoComplete(
  client: ApiClient,
  matchId: string,
  timeoutMs = 120_000,
): Promise<VetoState> {
  let result: VetoState | null = null;
  await expect.poll(async () => {
    const veto = await getVetoState(client, matchId);
    if (veto?.status === 'completed') {
      result = veto;
      return true;
    }
    return false;
  }, {
    timeout: timeoutMs,
    message: `Veto did not complete for match ${matchId}`,
  }).toBe(true);
  return result!;
}
