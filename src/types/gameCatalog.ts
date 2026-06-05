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
  modes: CatalogModeApi[];
  tournamentStructures: CatalogStructureApi[];
};

export type GameCatalogApiResponse = {
  catalogVersion: string;
  schemaVersion: number;
  contentHash: string;
  games: CatalogGameApi[];
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
