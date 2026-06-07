import { createContext } from 'react';
import type { EsportsGame } from '@/utils/gameFeatures';

export type GameCatalogContextValue = {
  games: EsportsGame[];
  isReady: boolean;
  isLoading: boolean;
  isError: boolean;
  isUnavailable: boolean;
  catalogVersion?: string;
  source?: 'api' | 'offline';
};

export const GameCatalogContext = createContext<GameCatalogContextValue>({
  games: [],
  isReady: false,
  isLoading: true,
  isError: false,
  isUnavailable: false,
});
