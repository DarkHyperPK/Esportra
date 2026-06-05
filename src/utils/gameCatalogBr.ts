import type { BRConfig, BRMapCatalogItem } from '@/types/battleRoyale';

export const BR_MAP_PLACEHOLDER_BASE = 'https://placehold.co/640x360/1a1a2e/eaeaea?text=';

export function brMapPlaceholderUrl(mapName: string): string {
  return `${BR_MAP_PLACEHOLDER_BASE}${encodeURIComponent(mapName)}`;
}

export function parseCatalogBrConfig(raw: unknown): BRConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return raw as BRConfig;
}

export function getCatalogMapItems(brConfig?: BRConfig | null): BRMapCatalogItem[] {
  const maps = brConfig?.maps;
  if (!maps) return [];

  if (maps.items?.length) {
    return maps.items.map((item) => ({
      name: item.name,
      imageUrl: item.imageUrl?.trim() || brMapPlaceholderUrl(item.name),
    }));
  }

  return (maps.pool ?? []).map((name) => ({
    name,
    imageUrl: brMapPlaceholderUrl(name),
  }));
}

export function getCatalogMapPool(brConfig?: BRConfig | null): string[] {
  return getCatalogMapItems(brConfig).map((item) => item.name);
}

export function catalogGameHasBRMaps(brConfig?: BRConfig | null): boolean {
  if (brConfig?.maps?.hasMaps === false) return false;
  if (brConfig?.maps?.hasMaps === true) return true;
  return getCatalogMapItems(brConfig).length > 0;
}

export function getMapImageUrl(
  brConfig: BRConfig | null | undefined,
  mapName: string,
): string {
  const item = getCatalogMapItems(brConfig).find(
    (entry) => entry.name.localeCompare(mapName, undefined, { sensitivity: 'accent' }) === 0,
  );
  return item?.imageUrl ?? brMapPlaceholderUrl(mapName);
}

export type GameCatalogGameResponse = {
  slug: string;
  name: string;
  category?: string | null;
  gameType: string;
  defaultModeKey: string;
  features: Record<string, unknown>;
  brConfig: unknown;
  modes: Array<Record<string, unknown>>;
  tournamentStructures: Array<Record<string, unknown>>;
};
