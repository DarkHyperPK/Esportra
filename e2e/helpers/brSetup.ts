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
type StageRow = { id: string };
type GroupRow = { id: string };
type RoundRow = { id: string; lobby_code?: string; lobbyCode?: string };

/**
 * API-driven BR tournament setup: create tournament, register players in parallel,
 * seed groups, create + activate a round with a lobby code.
 */
export async function setupBrRoundFixture(
  organizer: ApiClient,
  playerClients: ApiClient[],
  options?: { lobbyCode?: string; maxTeams?: number },
): Promise<BrTournamentFixture> {
  const stamp = Date.now();
  const lobbyCode = options?.lobbyCode ?? `E2E-${stamp.toString(36).toUpperCase()}`;
  const maxTeams = options?.maxTeams ?? Math.max(playerClients.length + 2, 8);

  const tournament = await organizer.post<TournamentRow>('/api/tournaments', {
    name: `E2E BR ${stamp}`,
    slug: `e2e-br-${stamp}`,
    game: 'Fortnite',
    tournamentType: 'battle_royale',
    teamSize: 1,
    maxTeams,
    startDate: new Date(Date.now() + 86_400_000).toISOString(),
    endDate: new Date(Date.now() + 172_800_000).toISOString(),
    registrationDeadline: new Date(Date.now() + 43_200_000).toISOString(),
    status: 'open',
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

  const stages = await organizer.get<StageRow[]>(`/api/tournaments/${tournamentId}/stages`);
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

  await organizer.patch(`/api/br/rounds/${round.id}`, { status: 'active', lobbyCode });

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
