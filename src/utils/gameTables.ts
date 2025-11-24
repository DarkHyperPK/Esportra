/**
 * Game-specific table name utilities
 * Returns the correct table name based on the game
 */

export type GameTableType = 'map_pools' | 'match_vetos' | 'veto_actions';

/**
 * Get the table name for a game-specific table
 * @param game - The game name (e.g., 'Valorant', 'CS2')
 * @param tableType - The type of table needed
 * @returns The table name with game prefix
 */
export function getGameTableName(game: string, tableType: GameTableType): string {
  // Normalize game name to lowercase with underscores
  const gamePrefix = game.toLowerCase().replace(/\s+/g, '_');
  
  const tableMap: Record<GameTableType, string> = {
    map_pools: `${gamePrefix}_tournament_map_pools`,
    match_vetos: `${gamePrefix}_match_map_vetos`,
    veto_actions: `${gamePrefix}_match_map_veto_actions`,
  };
  
  return tableMap[tableType];
}

/**
 * Get Valorant-specific table names (for backward compatibility and current use)
 */
export const valorantTables = {
  map_pools: 'valorant_tournament_map_pools',
  match_vetos: 'valorant_match_map_vetos',
  veto_actions: 'valorant_match_map_veto_actions',
} as const;

