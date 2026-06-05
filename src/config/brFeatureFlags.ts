/** Feature flags for BR rollout phases. Toggle when backend parity lands. */
export const BR_FEATURE_FLAGS = {
  /** Round map persistence + stage map config (requires backend br_rounds.map). */
  mapsEnabled: true,
  /** Cross-group overall advancement (requires backend top_n_overall). */
  topNOverallEnabled: false,
} as const;
