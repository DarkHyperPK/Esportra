import type { ApiClient } from './api';
import { defaultBrDates } from './brSetup';

export type BrowseTournamentRow = {
  id: string;
  name: string;
  slug: string;
  status?: string;
  created_at?: string;
  region?: string | null;
};

type CreateBrowseTournamentOptions = {
  name?: string;
  slug?: string;
  region?: string;
  status?: string;
  isPublic?: boolean;
  startDate?: string;
  endDate?: string;
  registrationDeadline?: string;
};

export async function createPublicBrowseTournament(
  organizer: ApiClient,
  options: CreateBrowseTournamentOptions = {},
): Promise<BrowseTournamentRow> {
  const stamp = Date.now();
  const dates = defaultBrDates();

  return organizer.post<BrowseTournamentRow>('/api/tournaments', {
    name: options.name ?? `E2E Browse ${stamp}`,
    slug: options.slug ?? `e2e-browse-${stamp}`,
    game: 'Fortnite',
    tournamentType: 'battle_royale',
    teamSize: 1,
    maxTeams: 8,
    region: options.region ?? 'eu',
    startDate: options.startDate ?? dates.startDate,
    endDate: options.endDate ?? dates.endDate,
    registrationDeadline: options.registrationDeadline ?? dates.registrationDeadline,
    status: options.status ?? 'open',
    isPublic: options.isPublic ?? true,
    checkInRequired: false,
    settings: {
      brConfig: {
        scoringPreset: 'fortnite',
        totalRounds: 1,
        lobbySize: 8,
      },
    },
  });
}

export async function listBrowseTournaments(
  client: ApiClient,
  params: Record<string, string>,
): Promise<BrowseTournamentRow[]> {
  const query = new URLSearchParams({ limit: '200', offset: '0', ...params });
  return client.get<BrowseTournamentRow[]>(`/api/tournaments?${query.toString()}`);
}
