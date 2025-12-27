/**
 * Game-specific table name utilities
 * Returns the correct table name based on the game
 * 
 * @deprecated This utility is becoming obsolete as we move to generic tables.
 * It now returns generic table names regardless of the game.
 */

export type GameTableType = 'map_pools' | 'match_vetos' | 'veto_actions';

/**
 * Get the table name for a game-specific table
 * @param game - The game name (e.g., 'Valorant', 'CS2')
 * @param tableType - The type of table needed
 * @returns The generic table name
 */
export function getGameTableName(game: string, tableType: GameTableType): string {
  // We are moving to generic tables, so we ignore the game prefix

  const tableMap: Record<GameTableType, string> = {
    map_pools: 'tournament_map_pools',
    match_vetos: 'match_map_vetos',
    veto_actions: 'match_map_veto_actions',
  };

  return tableMap[tableType];
}

/**
 * Get Valorant-specific table names (kept for backward compatibility during refactor)
 * These now point to the generic tables to ensure smooth transition.
 */
export const valorantTables = {
  map_pools: 'tournament_map_pools',
  match_vetos: 'match_map_vetos',
  veto_actions: 'match_map_veto_actions',
} as const;
