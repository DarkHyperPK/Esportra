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

function defaultBrDates() {
  const now = Date.now();
  return {
    startDate: new Date(now - 3_600_000).toISOString(),
    endDate: new Date(now + 172_800_000).toISOString(),
    registrationDeadline: new Date(now - 7_200_000).toISOString(),
  };
}

export async function setTournamentOngoing(
  organizer: ApiClient,
  tournamentId: string,
): Promise<void> {
  await organizer.put(`/api/tournaments/${tournamentId}`, { status: 'ongoing' });
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

export async function submitPlayerEvidence(
  client: ApiClient,
  roundId: string,
  evidencePath: string,
  placement: number,
  kills: number,
): Promise<void> {
  const imageUrl = await client.uploadEvidenceImage(evidencePath);
  await client.put(`/api/br/rounds/${roundId}/evidence`, {
    imageUrl,
    placement,
    kills,
  });
}

export async function getRoundEvidenceCount(
  organizer: ApiClient,
  roundId: string,
): Promise<number> {
  const evidence = await organizer.get<unknown[]>(`/api/br/rounds/${roundId}/evidence`);
  return evidence.length;
}
