import type { BRConfig } from '@/types/battleRoyale';

export type CatalogModeApi = {
  modeKey: string;
  name: string;
  teamSize: number;
  participantMode: string;
  allowsSubstitutes: boolean;
  maxRosterSize?: number | null;
  aliases?: string[];
  modeGroup?: string | null;
  variantLabel?: string | null;
  mapPoolFilter?: 'standard' | 'skirmish' | null;
  features?: Partial<Record<string, unknown>> | null;
};

export type CatalogStructureApi = {
  structureKey: string;
  name: string;
  isDefault: boolean;
};

export type CatalogGameApi = {
  slug: string;
  name: string;
  category?: string | null;
  gameType: string;
  defaultModeKey: string;
  features: Record<string, unknown>;
  brConfig: unknown;
  logo?: string | null;
  icon?: string | null;
  cover?: string | null;
  sortOrder?: number;
  aliases?: string[];
  modes: CatalogModeApi[];
  tournamentStructures: CatalogStructureApi[];
};

export type GameCatalogApiResponse = {
  catalogVersion: string;
  schemaVersion: number;
  contentHash: string;
  games: CatalogGameApi[];
};

export type GameCatalogVersionSummary = {
  id: string;
  catalogVersion: string;
  schemaVersion: number;
  contentHash: string;
  status: string;
  source: string;
  isActive: boolean;
  importedAt?: string | null;
  publishedAt?: string | null;
};

export type UpsertDraftGameRequest = {
  name: string;
  category?: string | null;
  gameType: string;
  defaultModeKey: string;
  features: Record<string, unknown>;
  brConfig?: unknown;
  logoUrl?: string | null;
  iconUrl?: string | null;
  coverUrl?: string | null;
  sortOrder: number;
  modes: CatalogModeApi[];
  tournamentStructures: CatalogStructureApi[];
  aliases?: string[];
};

export type ParsedCatalogGame = {
  slug: string;
  name: string;
  category: string;
  gameType: string;
  defaultModeKey: string;
  features: Record<string, unknown>;
  brConfig?: BRConfig;
  modes: CatalogModeApi[];
  tournamentStructures: CatalogStructureApi[];
};
