import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ApiClient } from './api';
import { defaultBrDates } from './brSetup';

type BackendGame = {
  name: string;
  slug: string;
  type: string;
  defaultFormat: string;
  defaultMode?: string;
  aliases?: string[];
  formats?: Array<{ key?: string; value: string; teamSize: number; participantMode?: string }>;
  modes?: Array<{ key?: string; value: string; teamSize: number; participantMode?: string }>;
  features: Record<string, unknown>;
  tournamentCapabilities?: { supportedStructures: Array<{ key: string }> };
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const defaultBackendCatalog = path.resolve(
  repoRoot,
  '../esportra-backend/src/Esportra.Api/GameCatalog/esportsGames.json',
);

const backendCatalogPath = path.resolve(
  process.env.E2E_BACKEND_CATALOG_PATH?.trim()
    || process.env.BACKEND_CATALOG_PATH?.trim()
    || defaultBackendCatalog,
);

function loadBackendCatalog(): { catalogVersion?: string; games: BackendGame[] } {
  if (!fs.existsSync(backendCatalogPath)) {
    throw new Error(
      `Backend catalog not found at ${backendCatalogPath}. Set E2E_BACKEND_CATALOG_PATH.`,
    );
  }
  return JSON.parse(fs.readFileSync(backendCatalogPath, 'utf8')) as {
    catalogVersion?: string;
    games: BackendGame[];
  };
}

export type CatalogMode = {
  modeKey: string;
  name: string;
  teamSize: number;
  participantMode: string;
  allowsSubstitutes: boolean;
  maxRosterSize: number | null;
  aliases: string[];
  modeGroup: string | null;
  variantLabel: string | null;
};

export type CatalogStructure = {
  structureKey: string;
  name: string;
  isDefault: boolean;
};

export type CatalogGame = {
  slug: string;
  name: string;
  category: string | null;
  gameType: string;
  defaultModeKey: string;
  features: Record<string, unknown>;
  brConfig: Record<string, unknown> | null;
  modes: CatalogMode[];
  tournamentStructures: CatalogStructure[];
};

export type CatalogResponse = {
  catalogVersion: string;
  schemaVersion: number;
  contentHash: string;
  games: CatalogGame[];
};

export function localCatalogGames(): BackendGame[] {
  return loadBackendCatalog().games;
}

export function localCatalogVersion(): string {
  return loadBackendCatalog().catalogVersion ?? '';
}

export function localModeKeys(game: BackendGame): string[] {
  const modes = game.modes?.length ? game.modes : game.formats ?? [];
  return modes.map((m) => m.key ?? m.value).sort();
}

export function localStructureKeys(game: BackendGame): string[] {
  return (game.tournamentCapabilities?.supportedStructures ?? [])
    .map((s) => s.key)
    .sort();
}

export function allLocalAliases(): Array<{ alias: string; slug: string }> {
  const rows: Array<{ alias: string; slug: string }> = [];
  for (const game of localCatalogGames()) {
    const aliases = new Set<string>([
      game.slug,
      game.name,
      ...(game.aliases ?? []),
    ]);
    for (const alias of aliases) {
      rows.push({ alias, slug: game.slug });
    }
  }
  return rows;
}

export function baseTournamentPayload(overrides: Record<string, unknown> = {}) {
  const stamp = Date.now();
  const dates = defaultBrDates();
  return {
    name: `E2E Catalog ${stamp}`,
    slug: `e2e-catalog-${stamp}`,
    maxTeams: 8,
    startDate: dates.startDate,
    endDate: dates.endDate,
    registrationDeadline: dates.registrationDeadline,
    status: 'draft',
    isPublic: false,
    checkInRequired: false,
    ...overrides,
  };
}

export async function fetchCatalog(apiUrl: string): Promise<CatalogResponse> {
  const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/games/catalog`);
  if (!res.ok) throw new Error(`GET /api/games/catalog failed (${res.status}): ${await res.text()}`);
  return res.json() as Promise<CatalogResponse>;
}

export async function fetchCatalogGame(
  apiUrl: string,
  slugOrAlias: string,
): Promise<{ status: number; body: CatalogGame | null }> {
  const res = await fetch(
    `${apiUrl.replace(/\/$/, '')}/api/games/catalog/${encodeURIComponent(slugOrAlias)}`,
  );
  if (res.status === 404) return { status: 404, body: null };
  if (!res.ok) throw new Error(`GET /api/games/catalog/${slugOrAlias} failed (${res.status}): ${await res.text()}`);
  return { status: res.status, body: (await res.json()) as CatalogGame };
}

export type CatalogTournamentRow = {
  id: string;
  slug?: string;
  game: string;
  format: string;
  game_mode?: string;
  gameMode?: string;
  team_size?: number;
  teamSize?: number;
};

export async function createCatalogTournament(
  organizer: ApiClient,
  overrides: Record<string, unknown>,
): Promise<CatalogTournamentRow> {
  return organizer.post<CatalogTournamentRow>('/api/tournaments', baseTournamentPayload(overrides));
}
