/** Lobby PATCH fields that belong on br_games when the per-game model is active. */
export type BrLobbyPatchFields = {
  lobbyCode?: string | null;
  status?: string;
  scheduledAt?: string | null;
  queueTimerMinutes?: number | null;
  map?: string | null;
};

/** Whether lobby-level schedule/queue/map UI should be hidden (multi-game stage). */
export function usesPerGameLobbyUi(gamesModelActive: boolean, gamesPerLobby: number): boolean {
  return gamesModelActive && gamesPerLobby > 1;
}

/** Whether lobby PATCH should omit schedule/queue/map (per-game fields active). */
export function shouldOmitLobbyGameFields(
  gamesModelActive: boolean,
  gameCount: number | null | undefined,
  gamesPerLobby: number,
): boolean {
  return gamesModelActive && (gamesPerLobby > 1 || (gameCount ?? 0) > 0);
}

/** Code-only lobby updates: omit schedule, queue, and map when games carry those fields. */
export function omitLobbyGameFieldsWhenGamesModel(
  gamesModelActive: boolean,
  gameCount: number | null | undefined,
  gamesPerLobby: number,
  body: BrLobbyPatchFields,
): BrLobbyPatchFields {
  if (!shouldOmitLobbyGameFields(gamesModelActive, gameCount, gamesPerLobby)) return body;
  const { scheduledAt: _scheduledAt, queueTimerMinutes: _queue, map: _map, ...rest } = body;
  return rest;
}

/** Schedule tab: game-only datetime inputs when multi-game stage with active schema. */
export function usesGameOnlySchedule(gamesModelActive: boolean, gamesPerLobby: number): boolean {
  return gamesModelActive && gamesPerLobby > 1;
}
