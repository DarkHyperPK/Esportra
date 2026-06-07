import { getCatalogGames, getLocalFallbackGames } from '@/utils/gameCatalogCache';
import type { EsportsGame } from '@/utils/gameFeatures';

const normalize = (value: string | undefined | null) => (value || '').trim().toLowerCase();

/** Catalog lookup without importing gameFeatures (avoids circular deps with logo resolver). */
export function findCatalogGame(gameName: string): EsportsGame | undefined {
  const normalized = normalize(gameName);
  const games = getCatalogGames() ?? getLocalFallbackGames();
  return games.find(
    (game) =>
      normalize(game.name) === normalized
      || normalize(game.slug) === normalized
      || (game.aliases || []).some((alias) => normalize(alias) === normalized),
  );
}
