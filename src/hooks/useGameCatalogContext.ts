import { useContext } from 'react';
import { GameCatalogContext } from '@/contexts/game-catalog-context';

export function useGameCatalogContext() {
  return useContext(GameCatalogContext);
}
