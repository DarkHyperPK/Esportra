import type { BRConfig, BRStageFormat } from '@/types/battleRoyale';

export interface BRGameContext {
  maxLobbySize: number;
  defaultGameCount: number;
  hasMaps: boolean;
  mapPool: string[];
  defaultMapMode: string;
}

export const deriveBRGameContext = (catalog: BRConfig | null | undefined, teamSize: number): BRGameContext => {
  const safeTeamSize = Math.max(1, teamSize || 1);
  const playersPerLobby = catalog?.playersPerLobby ?? 100;
  const maxLobbySize = Math.max(1, Math.floor(playersPerLobby / safeTeamSize));
  const mapPool = catalog?.maps?.pool ?? [];

  return {
    maxLobbySize,
    defaultGameCount: catalog?.defaultGameCount ?? 6,
    hasMaps: (catalog?.maps?.hasMaps ?? mapPool.length > 0) === true,
    mapPool,
    defaultMapMode: catalog?.defaultMapMode ?? 'none',
  };
};

export const recommendBRStageFormat = (
  registeredUnits: number,
  maxLobbySize: number,
): BRStageFormat => {
  if (registeredUnits <= maxLobbySize) return 'single_lobby';
  if (registeredUnits <= maxLobbySize * 4) return 'group_rotation';
  return 'multi_lobby_cut';
};
