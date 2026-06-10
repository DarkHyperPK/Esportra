export type PublicVetoGameMap = {
  id: string;
  game?: string;
  map_name?: string;
  mapName?: string;
  map_image_url?: string | null;
  mapImageUrl?: string | null;
};

export const PUBLIC_VETO_GAMES = [
  { value: "valorant", apiName: "Valorant", label: "Valorant", poolSize: 7 },
  { value: "cs2", apiName: "Counter-Strike 2", label: "Counter-Strike 2", poolSize: 7 },
  { value: "r6s", apiName: "Rainbow Six Siege", label: "Rainbow Six Siege", poolSize: 9 },
] as const;

const FALLBACK_MAP_IMAGE = "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=500&fit=crop&q=80";

export const publicVetoMapName = (map: PublicVetoGameMap) => map.mapName ?? map.map_name ?? "Unknown map";

export const isSkirmishMapName = (name: string) => /^skirmish\b/i.test(name.trim());

export const filterCompetitiveVetoMaps = (maps: PublicVetoGameMap[]) =>
  maps.filter((map) => !isSkirmishMapName(publicVetoMapName(map)));

export const getPublicVetoMapImage = (map: PublicVetoGameMap, game: string) => {
  const explicit = map.mapImageUrl ?? map.map_image_url;
  if (explicit) return explicit.trim();
  if (game === "valorant" && /^[0-9a-f-]{36}$/i.test(map.id)) {
    return `https://media.valorant-api.com/maps/${map.id}/splash.png`;
  }
  return FALLBACK_MAP_IMAGE;
};

export const buildPublicVetoMapsUrl = (apiGameName: string) =>
  `/api/games/maps?game=${encodeURIComponent(apiGameName)}`;
