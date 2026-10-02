/** Riot's map UUIDs, keyed by lowercase map name (code names included). */
const VALORANT_MAP_IDS: Record<string, string> = {
  abyss: "224b0a95-48b9-f703-1bd8-67aca101a61f",
  infinity: "224b0a95-48b9-f703-1bd8-67aca101a61f",
  ascent: "7eaecc1b-4337-bbf6-6ab9-04b8f06b3319",
  bind: "2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba",
  breeze: "2fb9a4fd-47b8-4e7d-a969-74b4046ebd53",
  corrode: "1c18ab1f-420d-0d8b-71d0-77ad3c439115",
  rook: "1c18ab1f-420d-0d8b-71d0-77ad3c439115",
  fracture: "b529448b-4d60-346e-e89e-00a4c527a405",
  haven: "2bee0dc9-4ffe-519b-1cbd-7fbe763a6047",
  icebox: "e2ad5c54-4114-a870-9641-8ea21279579a",
  lotus: "2fe4ed3a-450a-948b-6d6b-e89a78e680a9",
  pearl: "fd267378-4d1d-484f-ff52-77821ed10dc2",
  split: "d960549e-485c-e861-8d71-aa9d1aed12a2",
  sunset: "92584fbe-486a-b1b2-9faa-39b0f486b498",
  juliett: "92584fbe-486a-b1b2-9faa-39b0f486b498",
};

/** Riot's full-resolution (1920x1080) splash for a Valorant map, if the map is known. */
export function valorantMapSplash(mapName: string): string | null {
  const id = VALORANT_MAP_IDS[mapName.trim().toLowerCase()];
  return id ? `https://media.valorant-api.com/maps/${id}/splash.png` : null;
}

/** Smallest source that still reads sharp on a tall map card at 1080p. */
export const MIN_MAP_IMAGE = { width: 800, height: 600 };

/**
 * Which image a map card should use, given what the stored one turned out to be.
 * A stored image that failed, or is too small for the card, gives way to the
 * official splash when one exists; otherwise the stored image stays.
 */
export function chooseMapImage(
  stored: string,
  fallback: string | null,
  loaded: { width: number; height: number } | "error",
): string {
  if (!fallback || fallback === stored) return stored;
  if (loaded === "error") return fallback;
  return loaded.width < MIN_MAP_IMAGE.width || loaded.height < MIN_MAP_IMAGE.height ? fallback : stored;
}

/** Re-points recorded veto entries at the image their map now uses (after an upgrade). */
export function withMapImages<E extends { mapId: string; mapImageUrl?: string | null }>(
  entries: E[],
  maps: Array<{ id: string; map_image_url?: string | null }>,
): E[] {
  const images = new Map(maps.map((map) => [String(map.id), map.map_image_url]));
  return entries.map((entry) => {
    const image = images.get(entry.mapId);
    return image && image !== entry.mapImageUrl ? { ...entry, mapImageUrl: image } : entry;
  });
}
