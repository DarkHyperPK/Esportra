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

export type PublicVetoPickedMap = {
  mapId: string;
  side?: string | null;
};

export type PublicVetoState = {
  id: string;
  game: string;
  bestOf: number;
  team1Name: string;
  team2Name: string;
  team1Id: string;
  team2Id: string;
  status: string;
  currentTeamId?: string | null;
  currentAction?: "ban" | "pick" | "pick_side" | null;
  currentActionNumber?: number;
  team1BannedMaps: string[];
  team2BannedMaps: string[];
  team1PickedMaps: PublicVetoPickedMap[];
  team2PickedMaps: PublicVetoPickedMap[];
  selectedMapId?: string | null;
  maps: PublicVetoGameMap[];
  hostToken?: string | null;
  team1Token?: string | null;
  team2Token?: string | null;
  overlayToken?: string | null;
  role: "host" | "team1" | "team2" | "viewer";
  expiresAt?: string;
};

const pickVetoField = (row: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

const normalizePickedMapsField = (raw: unknown): PublicVetoPickedMap[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((pick) => {
    const row = (pick ?? {}) as Record<string, unknown>;
    return {
      mapId: String(pickVetoField(row, "mapId", "map_id", "mapid") ?? ""),
      side: pickVetoField(row, "side") as string | null | undefined,
    };
  }).filter((pick) => Boolean(pick.mapId));
};

export const normalizePublicVetoState = (raw: Record<string, unknown>): PublicVetoState => {
  const mapsRaw = pickVetoField(raw, "maps", "Maps");
  const roleRaw = String(pickVetoField(raw, "role", "Role") ?? "viewer");

  return {
    id: String(pickVetoField(raw, "id", "Id") ?? ""),
    game: String(pickVetoField(raw, "game", "Game") ?? "valorant"),
    bestOf: Number(pickVetoField(raw, "bestOf", "best_of", "bestof") ?? 1),
    team1Name: String(pickVetoField(raw, "team1Name", "team1_name", "team1name") ?? "Team 1"),
    team2Name: String(pickVetoField(raw, "team2Name", "team2_name", "team2name") ?? "Team 2"),
    team1Id: String(pickVetoField(raw, "team1Id", "team1_id", "team1id") ?? ""),
    team2Id: String(pickVetoField(raw, "team2Id", "team2_id", "team2id") ?? ""),
    status: String(pickVetoField(raw, "status", "Status") ?? "pending"),
    currentTeamId: (pickVetoField(raw, "currentTeamId", "current_team_id", "currentteamid") ?? null) as string | null,
    currentAction: (pickVetoField(raw, "currentAction", "current_action", "currentaction") ?? null) as PublicVetoState["currentAction"],
    currentActionNumber: Number(pickVetoField(raw, "currentActionNumber", "current_action_number", "currentactionnumber") ?? 0),
    team1BannedMaps: (pickVetoField(raw, "team1BannedMaps", "team1_banned_maps", "team1bannedmaps") as string[]) ?? [],
    team2BannedMaps: (pickVetoField(raw, "team2BannedMaps", "team2_banned_maps", "team2bannedmaps") as string[]) ?? [],
    team1PickedMaps: normalizePickedMapsField(pickVetoField(raw, "team1PickedMaps", "team1_picked_maps", "team1pickedmaps")),
    team2PickedMaps: normalizePickedMapsField(pickVetoField(raw, "team2PickedMaps", "team2_picked_maps", "team2pickedmaps")),
    selectedMapId: (pickVetoField(raw, "selectedMapId", "selected_map_id", "selectedmapid") ?? null) as string | null,
    maps: Array.isArray(mapsRaw) ? mapsRaw as PublicVetoGameMap[] : [],
    hostToken: (pickVetoField(raw, "hostToken", "host_token", "hosttoken") ?? null) as string | null,
    team1Token: (pickVetoField(raw, "team1Token", "team1_token", "team1token") ?? null) as string | null,
    team2Token: (pickVetoField(raw, "team2Token", "team2_token", "team2token") ?? null) as string | null,
    overlayToken: (pickVetoField(raw, "overlayToken", "overlay_token", "overlaytoken") ?? null) as string | null,
    role: roleRaw === "host" || roleRaw === "team1" || roleRaw === "team2" ? roleRaw : "viewer",
    expiresAt: pickVetoField(raw, "expiresAt", "expires_at", "expiresat") as string | undefined,
  };
};

export type PublicVetoHistoryRow = {
  actionNumber: number;
  teamName: string;
  teamSide?: string;
  action: string;
  mapName?: string;
  mapId: string;
  mapImageUrl?: string | null;
  side?: string | null;
  createdAt?: string;
};

/** Postgres lowercases unquoted SQL aliases; enrich map metadata from the session pool. */
export const normalizePublicVetoHistoryRow = (
  raw: Record<string, unknown>,
  maps: PublicVetoGameMap[],
  game: string,
): PublicVetoHistoryRow => {
  const mapId = String(pickVetoField(raw, "mapId", "map_id", "mapid") ?? "");
  const map = maps.find((entry) => entry.id === mapId);
  const resolvedName = pickVetoField(raw, "mapName", "map_name", "mapname");
  const resolvedImage = pickVetoField(raw, "mapImageUrl", "map_image_url", "mapimageurl");

  return {
    actionNumber: Number(pickVetoField(raw, "actionNumber", "action_number", "actionnumber") ?? 0),
    teamName: String(pickVetoField(raw, "teamName", "team_name", "teamname") ?? "Team 1"),
    teamSide: String(pickVetoField(raw, "teamSide", "team_side", "teamside") ?? "team1"),
    action: String(pickVetoField(raw, "action", "actionType", "action_type", "actiontype") ?? "ban"),
    mapId,
    mapName: resolvedName ? String(resolvedName) : map ? publicVetoMapName(map) : "Unknown Map",
    mapImageUrl: resolvedImage
      ? String(resolvedImage)
      : map
        ? getPublicVetoMapImage(map, game)
        : null,
    side: (pickVetoField(raw, "side") as string | null | undefined) ?? null,
    createdAt: pickVetoField(raw, "createdAt", "created_at", "createdat") as string | undefined,
  };
};

export const normalizePublicVetoSide = (side?: string | null): "attack" | "defend" | null => {
  if (!side) return null;
  const value = side.toLowerCase();
  if (value === "defense" || value === "defend") return "defend";
  return "attack";
};

export const serializePublicVetoSide = (side: "attack" | "defend" | null) =>
  side === "defend" ? "defend" : side;

export const adaptPublicMapsToGameMaps = (maps: PublicVetoGameMap[], game: string) =>
  maps.map((map) => ({
    id: map.id,
    game,
    map_name: publicVetoMapName(map),
    map_image_url: getPublicVetoMapImage(map, game),
    is_active: true,
  }));

export const adaptPublicVetoToMatchVeto = (state: PublicVetoState) => ({
  id: state.id,
  matchId: "public-tool",
  tournamentId: "public-tool",
  team1Id: state.team1Id,
  team2Id: state.team2Id,
  team1LinkToken: state.team1Token,
  team2LinkToken: state.team2Token,
  bestOf: state.bestOf,
  status: state.status,
  currentTeamId: state.currentTeamId,
  currentAction: state.currentAction,
  currentActionNumber: state.currentActionNumber ?? 0,
  team1BannedMaps: state.team1BannedMaps,
  team2BannedMaps: state.team2BannedMaps,
  team1PickedMaps: state.team1PickedMaps.map((pick) => ({
    mapId: pick.mapId,
    side: normalizePublicVetoSide(pick.side),
  })),
  team2PickedMaps: state.team2PickedMaps.map((pick) => ({
    mapId: pick.mapId,
    side: normalizePublicVetoSide(pick.side),
  })),
  selectedMapId: state.selectedMapId,
  game: state.game,
});

export const buildPublicTeamVetoUrl = (token: string) =>
  `${window.location.origin}/tools/map-veto/team/${token}`;

export const buildPublicHostVetoUrl = (token: string) =>
  `${window.location.origin}/tools/map-veto/host/${token}`;

export const buildPublicVetoOverlayUrl = (token: string, transition = "up") =>
  `${window.location.origin}/tools/map-veto/overlay/${token}?transition=${encodeURIComponent(transition)}`;
