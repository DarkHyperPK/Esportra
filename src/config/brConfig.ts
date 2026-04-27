/** Central config for Battle Royale polling intervals and stale times (ms). */
export const BR_CONFIG = {
  /** Active game polling interval — 5 s */
  POLL_INTERVAL_MS: 5_000,
  /** Query stale time — 60 s (data is considered fresh for 1 min) */
  STALE_TIME_MS: 60_000,
  /** Leaderboard stale time — 30 s (slightly more aggressive) */
  LEADERBOARD_STALE_TIME_MS: 30_000,
  /** Rounds stale time — 30 s */
  ROUNDS_STALE_TIME_MS: 30_000,
} as const;
