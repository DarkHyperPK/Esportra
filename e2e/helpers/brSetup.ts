import { expect } from '@playwright/test';
import type { ApiClient } from './api';

export type BrTournamentFixture = {
  tournamentId: string;
  tournamentName: string;
  slug: string;
  stageId: string;
  groupId: string;
  roundId: string;
  lobbyCode: string;
};

type TournamentRow = { id: string; slug: string; name: string };
type StageRow = {
  id: string;
  stage_order?: number;
  stageOrder?: number;
  name?: string;
  progress_label?: string;
  progressLabel?: string;
};
type GroupRow = { id: string };
type RoundRow = { id: string; lobby_code?: string; lobbyCode?: string };

export type BRGroupRow = {
  id: string;
  name?: string;
  team_count?: number;
  teamCount?: number;
  lobby_size?: number;
  lobbySize?: number;
};

export type BRGroupTeamRow = {
  team_id?: string | null;
  participant_id?: string | null;
  team_name?: string | null;
  teamName?: string | null;
};

export type BRRoundRow = {
  id: string;
  round_number?: number;
  roundNumber?: number;
  status?: string;
  lobby_code?: string | null;
  lobbyCode?: string | null;
};

export type BrTournamentOptions = {
  lobbyCode?: string;
  maxTeams?: number;
  /** When true (default), patch round to active after create. Requires tournament ongoing + in-window dates. */
  activateRound?: boolean;
  startDate?: string;
  endDate?: string;
  registrationDeadline?: string;
  status?: string;
};

export type StageCompletionStatus = {
  isComplete: boolean;
  alreadyAdvanced?: boolean;
  progressLabel?: string;
  reason?: string;
  groupsTotal?: number;
  groupsWithCompletedRounds?: number;
};

export async function createOrganizerClientFromEnv(env: {
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  organizerEmail: string;
  organizerPassword: string;
}, signInWithPassword: (url: string, key: string, email: string, password: string) => Promise<{ access_token: string }>): Promise<ApiClient> {
  const session = await signInWithPassword(
    env.supabaseUrl,
    env.supabaseAnonKey,
    env.organizerEmail,
    env.organizerPassword,
  );
  return new ApiClient(env.apiUrl, session.access_token);
}

export function defaultBrDates() {
  const now = Date.now();
  return {
    startDate: new Date(now + 7_200_000).toISOString(),
    endDate: new Date(now + 172_800_000).toISOString(),
    registrationDeadline: new Date(now + 3_600_000).toISOString(),
  };
}

async function closeRegistrationIfDefault(
  organizer: ApiClient,
  tournamentId: string,
  options?: { startDate?: string; endDate?: string; registrationDeadline?: string },
): Promise<void> {
  if (options?.startDate || options?.registrationDeadline) return;
  const now = Date.now();
  await organizer.put(`/api/tournaments/${tournamentId}`, {
    startDate: new Date(now - 3_600_000).toISOString(),
    registrationDeadline: new Date(now - 7_200_000).toISOString(),
    ...(!options?.endDate ? { endDate: new Date(now + 172_800_000).toISOString() } : {}),
  });
}

export async function setTournamentOngoing(
  organizer: ApiClient,
  tournamentId: string,
): Promise<void> {
  await organizer.put(`/api/tournaments/${tournamentId}`, { status: 'ongoing' });
}

export async function setTournamentStatus(
  organizer: ApiClient,
  tournamentId: string,
  status: string,
): Promise<void> {
  await organizer.put(`/api/tournaments/${tournamentId}`, { status });
}

export async function getTournamentStages(
  organizer: ApiClient,
  tournamentId: string,
): Promise<StageRow[]> {
  return organizer.get<StageRow[]>(`/api/tournaments/${tournamentId}/stages`);
}

export async function getStageCompletionStatus(
  organizer: ApiClient,
  stageId: string,
): Promise<StageCompletionStatus> {
  return organizer.get(`/api/stages/${stageId}/completion-status`);
}

export async function getBRGroups(organizer: ApiClient, stageId: string): Promise<BRGroupRow[]> {
  return organizer.get<BRGroupRow[]>(`/api/stages/${stageId}/br/groups`);
}

export async function getBRGroupTeams(
  organizer: ApiClient,
  stageId: string,
  groupId: string,
): Promise<BRGroupTeamRow[]> {
  return organizer.get<BRGroupTeamRow[]>(`/api/stages/${stageId}/br/groups/${groupId}/teams`);
}

export async function createBRGroups(
  organizer: ApiClient,
  stageId: string,
  params: { groupCount: number; lobbySize?: number; force?: boolean },
): Promise<BRGroupRow[]> {
  return organizer.post<BRGroupRow[]>(`/api/stages/${stageId}/br/groups`, params);
}

export async function seedGroups(
  organizer: ApiClient,
  stageId: string,
  method: 'random' | 'snake' = 'random',
): Promise<{ assigned: number; groups: number }> {
  return organizer.post(`/api/stages/${stageId}/br/groups/assign`, { method });
}

export async function createRound(
  organizer: ApiClient,
  stageId: string,
  groupId: string,
  body: { lobbyCode?: string | null; scheduledAt?: string | null; queueTimerMinutes?: number | null } = {},
): Promise<BRRoundRow> {
  return organizer.post<BRRoundRow>(`/api/stages/${stageId}/br/groups/${groupId}/rounds`, body);
}

export async function updateRound(
  organizer: ApiClient,
  roundId: string,
  body: { status?: string; lobbyCode?: string | null; scheduledAt?: string | null; queueTimerMinutes?: number | null },
): Promise<BRRoundRow> {
  return organizer.patch<BRRoundRow>(`/api/br/rounds/${roundId}`, body);
}

export async function getGroupRounds(
  organizer: ApiClient,
  stageId: string,
  groupId: string,
): Promise<BRRoundRow[]> {
  return organizer.get<BRRoundRow[]>(`/api/stages/${stageId}/br/groups/${groupId}/rounds`);
}

export async function waitForRoundStatus(
  organizer: ApiClient,
  stageId: string,
  groupId: string,
  roundId: string,
  status: string,
  timeoutMs = 45_000,
): Promise<BRRoundRow> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const rounds = await getGroupRounds(organizer, stageId, groupId);
    const round = rounds.find((item) => item.id === roundId);
    if (round?.status === status) return round;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  throw new Error(`Round ${roundId} did not reach status '${status}' within ${timeoutMs}ms`);
}

export async function resetRound(organizer: ApiClient, roundId: string): Promise<BRRoundRow> {
  return organizer.post<BRRoundRow>(`/api/br/rounds/${roundId}/reset`, {});
}

export async function syncBrStagesTwoStage(
  organizer: ApiClient,
  tournamentId: string,
  existingStageId: string,
): Promise<{ qualifierStageId: string; finalsStageId: string }> {
  await organizer.put(`/api/tournaments/${tournamentId}/stages`, {
    stages: [
      {
        id: existingStageId,
        name: 'Qualifiers',
        format: 'battle_royale',
        stageOrder: 1,
        advancementCount: 2,
        capacity: null,
      },
      {
        name: 'Finals',
        format: 'battle_royale',
        stageOrder: 2,
        advancementCount: null,
        capacity: null,
      },
    ],
  });

  const stages = await getTournamentStages(organizer, tournamentId);
  const qualifier = stages.find(
    (s) => (s.stage_order ?? s.stageOrder) === 1 || s.name === 'Qualifiers',
  );
  const finals = stages.find(
    (s) => (s.stage_order ?? s.stageOrder) === 2 || s.name === 'Finals',
  );
  if (!qualifier?.id || !finals?.id) {
    throw new Error('Failed to sync two-stage BR structure');
  }

  await organizer.post(`/api/stages/${qualifier.id}/br/bootstrap`, {});
  return { qualifierStageId: qualifier.id, finalsStageId: finals.id };
}

/**
 * API-driven BR tournament setup: create tournament, register players in parallel,
 * seed groups, create + optionally activate a round with a lobby code.
 */
export async function setupMinimalBracketFixture(
  organizer: ApiClient,
): Promise<{ tournamentId: string; slug: string; stageId: string }> {
  const stamp = Date.now();
  const dates = defaultBrDates();

  const tournament = await organizer.post<TournamentRow>('/api/tournaments', {
    name: `E2E Bracket ${stamp}`,
    slug: `e2e-bracket-${stamp}`,
    game: 'Valorant',
    tournamentType: 'single_elimination',
    teamSize: 5,
    maxTeams: 8,
    startDate: dates.startDate,
    endDate: dates.endDate,
    registrationDeadline: dates.registrationDeadline,
    status: 'open',
    isPublic: true,
    checkInRequired: false,
  });

  const existingStages = await getTournamentStages(organizer, tournament.id);
  let stageId = existingStages[0]?.id;

  if (!stageId) {
    await organizer.put(`/api/tournaments/${tournament.id}/stages`, {
      stages: [
        {
          name: 'Playoffs',
          format: 'single_elimination',
          stageOrder: 1,
          advancementCount: 4,
          capacity: 8,
        },
      ],
    });
    const stages = await getTournamentStages(organizer, tournament.id);
    stageId = stages[0]?.id;
  }

  if (!stageId) throw new Error('Bracket tournament has no stages after setup');

  return { tournamentId: tournament.id, slug: tournament.slug, stageId };
}

export async function createBrTournament(
  organizer: ApiClient,
  playerClients: ApiClient[],
  options: BrTournamentOptions & { autoBootstrap?: boolean; autoSeed?: boolean } = {},
): Promise<Omit<BrTournamentFixture, 'groupId' | 'roundId' | 'lobbyCode'> & { lobbyCode: string }> {
  const stamp = Date.now();
  const lobbyCode = options.lobbyCode ?? `E2E-${stamp.toString(36).toUpperCase()}`;
  const maxTeams = options.maxTeams ?? Math.max(playerClients.length + 2, 8);
  const dates = defaultBrDates();

  const tournament = await organizer.post<TournamentRow>('/api/tournaments', {
    name: `E2E BR ${stamp}`,
    slug: `e2e-br-${stamp}`,
    game: 'Fortnite',
    tournamentType: 'battle_royale',
    teamSize: 1,
    maxTeams,
    startDate: options.startDate ?? dates.startDate,
    endDate: options.endDate ?? dates.endDate,
    registrationDeadline: options.registrationDeadline ?? dates.registrationDeadline,
    status: options.status ?? 'open',
    isPublic: true,
    checkInRequired: false,
    settings: {
      brConfig: {
        scoringPreset: 'fortnite',
        totalRounds: 2,
        lobbySize: maxTeams,
      },
    },
  });

  await Promise.all(
    playerClients.map((client) =>
      client.post(`/api/tournaments/${tournament.id}/register`, {}),
    ),
  );
  await closeRegistrationIfDefault(organizer, tournament.id, options);

  const stages = await getTournamentStages(organizer, tournament.id);
  const stageId = stages[0]?.id;
  if (!stageId) throw new Error('Tournament has no stages after create');

  if (options.autoBootstrap !== false) {
    await organizer.post(`/api/stages/${stageId}/br/bootstrap`, {});
  }

  if (options.autoSeed !== false) {
    await seedGroups(organizer, stageId, 'random');
  }

  return {
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    slug: tournament.slug,
    stageId,
    lobbyCode,
  };
}

export async function setupBrRoundFixture(
  organizer: ApiClient,
  playerClients: ApiClient[],
  options?: BrTournamentOptions,
): Promise<BrTournamentFixture> {
  const stamp = Date.now();
  const lobbyCode = options?.lobbyCode ?? `E2E-${stamp.toString(36).toUpperCase()}`;
  const maxTeams = options?.maxTeams ?? Math.max(playerClients.length + 2, 8);
  const activateRound = options?.activateRound !== false;
  const dates = defaultBrDates();

  const tournament = await organizer.post<TournamentRow>('/api/tournaments', {
    name: `E2E BR ${stamp}`,
    slug: `e2e-br-${stamp}`,
    game: 'Fortnite',
    tournamentType: 'battle_royale',
    teamSize: 1,
    maxTeams,
    startDate: options?.startDate ?? dates.startDate,
    endDate: options?.endDate ?? dates.endDate,
    registrationDeadline: options?.registrationDeadline ?? dates.registrationDeadline,
    status: options?.status ?? 'open',
    isPublic: true,
    checkInRequired: false,
    settings: {
      brConfig: {
        scoringPreset: 'fortnite',
        totalRounds: 1,
        lobbySize: maxTeams,
      },
    },
  });

  const tournamentId = tournament.id;
  const slug = tournament.slug;

  await Promise.all(
    playerClients.map((client) =>
      client.post(`/api/tournaments/${tournamentId}/register`, {}),
    ),
  );
  await closeRegistrationIfDefault(organizer, tournamentId, options);

  const stages = await getTournamentStages(organizer, tournamentId);
  const stageId = stages[0]?.id;
  if (!stageId) throw new Error('Tournament has no stages after create');

  await organizer.post(`/api/stages/${stageId}/br/bootstrap`, {});

  const assignResult = await organizer.post<{ assigned?: number }>(
    `/api/stages/${stageId}/br/groups/assign`,
    { method: 'random' },
  );
  if (!assignResult.assigned || assignResult.assigned < playerClients.length) {
    throw new Error(`Expected at least ${playerClients.length} assigned players, got ${assignResult.assigned ?? 0}`);
  }

  const groups = await organizer.get<GroupRow[]>(`/api/stages/${stageId}/br/groups`);
  const groupId = groups[0]?.id;
  if (!groupId) throw new Error('No BR groups after bootstrap/assign');

  const round = await organizer.post<RoundRow>(
    `/api/stages/${stageId}/br/groups/${groupId}/rounds`,
    { lobbyCode },
  );

  if (activateRound) {
    await setTournamentOngoing(organizer, tournamentId);
    await organizer.patch(`/api/br/rounds/${round.id}`, { status: 'active', lobbyCode });
  }

  return {
    tournamentId,
    tournamentName: tournament.name,
    slug,
    stageId,
    groupId,
    roundId: round.id,
    lobbyCode,
  };
}

export async function publishRoundResultsDirect(
  organizer: ApiClient,
  stageId: string,
  groupId: string,
  roundId: string,
): Promise<void> {
  type GroupTeam = { team_id?: string | null; participant_id?: string | null };
  const teams = await organizer.get<GroupTeam[]>(
    `/api/stages/${stageId}/br/groups/${groupId}/teams`,
  );

  const results = teams.map((team, index) => ({
    teamId: team.team_id ?? team.participant_id,
    placement: index + 1,
    kills: Math.max(0, 3 - index),
  }));

  await organizer.put(`/api/br/rounds/${roundId}/results`, { results });
  await organizer.patch(`/api/br/rounds/${roundId}`, { status: 'completed' });
}

export async function saveRoundResultsDirect(
  organizer: ApiClient,
  stageId: string,
  groupId: string,
  roundId: string,
): Promise<void> {
  type GroupTeam = { team_id?: string | null; participant_id?: string | null };
  const teams = await organizer.get<GroupTeam[]>(
    `/api/stages/${stageId}/br/groups/${groupId}/teams`,
  );

  const results = teams.map((team, index) => ({
    teamId: team.team_id ?? team.participant_id,
    placement: index + 1,
    kills: Math.max(0, 3 - index),
  }));

  await organizer.put(`/api/br/rounds/${roundId}/results`, { results });
}

export async function publishRoundResultsFromEvidence(
  organizer: ApiClient,
  roundId: string,
): Promise<void> {
  type EvidenceRow = { teamId: string; placement?: number | null; kills?: number | null };
  const evidence = await organizer.get<EvidenceRow[]>(`/api/br/rounds/${roundId}/evidence`);

  for (const item of evidence) {
    await organizer.patch(`/api/br/rounds/${roundId}/evidence/${item.teamId}`, { reviewed: true });
  }

  const results = evidence.map((item, index) => ({
    teamId: item.teamId,
    placement: index + 1,
    kills: item.kills ?? 0,
  }));

  await organizer.put(`/api/br/rounds/${roundId}/results`, { results });
  await organizer.patch(`/api/br/rounds/${roundId}`, { status: 'completed' });
}

async function waitForSubmittedEvidence(
  client: ApiClient,
  roundId: string,
  timeoutMs = 20_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'evidence row not visible yet';

  while (Date.now() < deadline) {
    try {
      const rows = await client.get<unknown[]>(`/api/br/rounds/${roundId}/evidence`);
      if (Array.isArray(rows) && rows.length > 0) return;
      lastError = 'evidence GET returned an empty list';
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  throw new Error(`Evidence for round ${roundId} never became visible: ${lastError}`);
}

export async function submitPlayerEvidence(
  client: ApiClient,
  roundId: string,
  evidencePath: string,
  placement: number,
  kills: number,
): Promise<void> {
  const imageUrl = await client.uploadEvidenceImage(evidencePath);
  try {
    await client.put(`/api/br/rounds/${roundId}/evidence`, {
      imageUrl,
      placement,
      kills,
    });
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Staging can persist evidence then 500 on post-insert work; 409 means duplicate submit.
    if (!message.includes('failed (500)') && !message.includes('failed (409)')) {
      throw error;
    }
  }

  await waitForSubmittedEvidence(client, roundId);
}

type PlayerBrContextResponse = {
  groupId?: string | null;
  activeRound?: {
    lobbyCode?: string | null;
    lobby_code?: string | null;
    status?: string;
  } | null;
};

function readPlayerLobbyCode(context: PlayerBrContextResponse): string | null {
  return context.activeRound?.lobbyCode ?? context.activeRound?.lobby_code ?? null;
}

export async function waitForPlayerBrAssignment(
  player: ApiClient,
  tournamentId: string,
  timeoutMs = 60_000,
): Promise<PlayerBrContextResponse> {
  let latest: PlayerBrContextResponse = {};
  await expect.poll(async () => {
    latest = await player.get<PlayerBrContextResponse>(`/api/tournaments/${tournamentId}/br/player-context`);
    return latest.groupId ?? null;
  }, {
    timeout: timeoutMs,
    message: 'player-context never assigned the player to a BR group',
  }).not.toBeNull();
  return latest;
}

export async function waitForPlayerLobbyCodeApi(
  player: ApiClient,
  tournamentId: string,
  lobbyCode: string,
  timeoutMs = 60_000,
): Promise<void> {
  await waitForPlayerBrAssignment(player, tournamentId, timeoutMs);
  await expect.poll(async () => {
    const context = await player.get<PlayerBrContextResponse>(`/api/tournaments/${tournamentId}/br/player-context`);
    return readPlayerLobbyCode(context);
  }, {
    timeout: timeoutMs,
    message: `player-context never exposed lobby code ${lobbyCode}`,
  }).toBe(lobbyCode);
}

export async function getRoundEvidenceCount(
  organizer: ApiClient,
  roundId: string,
): Promise<number> {
  const evidence = await organizer.get<unknown[]>(`/api/br/rounds/${roundId}/evidence`);
  return evidence.length;
}
