/** Feature flags for BR rollout phases. Toggle when backend parity lands. */
export const BR_FEATURE_FLAGS = {
  /** Round map persistence + stage map config (requires backend br_rounds.map). */
  mapsEnabled: true,
  /** Enable pro stage structure (format + lobby formation). */
  proStructureEnabled: true,
  groupRotationEnabled: true,
  multiLobbyCutEnabled: true,
  stageGlobalLeaderboard: true,
  /** Cross-group overall advancement (requires backend top_n_overall). */
  topNOverallEnabled: true,
  topNPerLobbyEnabled: true,
} as const;
