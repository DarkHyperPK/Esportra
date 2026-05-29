import type { ApiClient } from './api';
import { signInWithPassword } from './auth';
import type { E2eEnv } from './env';

export type TeamRow = { id: string; name: string; owner_id?: string };
export type RosterRow = { id: string; name: string; game: string; format?: string | null; team_size?: number };

export async function getUserId(
  env: E2eEnv,
  email: string,
  password: string,
): Promise<string> {
  const session = await signInWithPassword(env.supabaseUrl, env.supabaseAnonKey, email, password);
  return session.user.id;
}

export async function ensureCaptainTeam(
  client: ApiClient,
  stamp: string,
  ownerId: string,
): Promise<TeamRow> {
  const owned = await client.get<TeamRow[]>(`/api/teams?owner_id=${ownerId}&limit=5`);
  const match = (owned ?? []).find((team) => String(team.owner_id).toLowerCase() === ownerId.toLowerCase());
  if (match) return match;

  return client.post<TeamRow>('/api/teams', {
    name: `E2E Catalog Team ${stamp}`,
    tag: `E2E${String(stamp).slice(-4)}`,
    game: 'General',
    gameFormat: 'squad',
  });
}

export async function createValorantRoster(
  client: ApiClient,
  teamId: string,
  stamp: string,
  options: { format?: string; teamSize?: number; name?: string } = {},
): Promise<RosterRow> {
  const format = options.format ?? '5v5';
  const existing = await client.get<RosterRow[]>(`/api/teams/${teamId}/rosters`);
  const match = (existing ?? []).find(
    (row) => row.format === format && row.game?.toLowerCase() === 'valorant',
  );
  if (match) return match;

  return client.post<RosterRow>(`/api/teams/${teamId}/rosters`, {
    name: options.name ?? `E2E Val Roster ${stamp}`,
    game: 'Valorant',
    format,
    teamSize: options.teamSize ?? 5,
  });
}

export async function addRosterStarter(
  client: ApiClient,
  teamId: string,
  rosterId: string,
  userId: string,
): Promise<void> {
  await client.post(`/api/teams/${teamId}/rosters/${rosterId}/members`, { userId });
  await client.put(`/api/teams/${teamId}/rosters/${rosterId}/members/${userId}/starter`, {
    isStarter: true,
  });
}

export async function buildSkirmish2v2Roster(
  captainClient: ApiClient,
  captainId: string,
  secondPlayerId: string,
  stamp: string,
): Promise<{ teamId: string; rosterId: string }> {
  const team = await ensureCaptainTeam(captainClient, stamp, captainId);
  const roster = await createValorantRoster(captainClient, team.id, stamp, {
    format: 'skirmish_2v2',
    teamSize: 2,
    name: `E2E 2v2 ${stamp}`,
  });
  await addRosterStarter(captainClient, team.id, roster.id, secondPlayerId);
  return { teamId: team.id, rosterId: roster.id };
}

export async function buildUnderstaffedValorantRoster(
  captainClient: ApiClient,
  captainId: string,
  stamp: string,
): Promise<{ teamId: string; rosterId: string }> {
  const team = await ensureCaptainTeam(captainClient, stamp, captainId);
  const roster = await createValorantRoster(captainClient, team.id, stamp, {
    format: '5v5',
    teamSize: 5,
    name: `E2E Understaffed ${stamp}`,
  });
  return { teamId: team.id, rosterId: roster.id };
}
