/**
 * gameContext.ts — Derives season-wizard metadata from the backend game catalog cache.
 */

import { getGameByName, getDefaultTeamSize, listCatalogGames } from '@/utils/gameFeatures';

export type GameGenre = 'fps' | 'moba' | 'br' | 'fighter' | 'sports' | 'rts';

export interface GameContext {
  genre: GameGenre;
  defaultTeamSize: number;
  defaultFormat: string;
  suggestedTemplateIds: string[];
  hasMapVeto: boolean;
  hasPickBan: boolean;
  scoringType: 'placement' | 'match_wins' | 'kill_based';
  isTeamGame: boolean;
  isBattleRoyale: boolean;
}

const CATEGORY_GENRE: Record<string, GameGenre> = {
  fps: 'fps',
  moba: 'moba',
  fighting: 'fighter',
  sports: 'sports',
  rts: 'rts',
};

const TEMPLATE_BY_GENRE: Record<GameGenre, string[]> = {
  fps: ['team-bracket-safe'],
  moba: ['team-bracket-safe'],
  br: ['br-safe'],
  fighter: ['sports-bracket-safe'],
  sports: ['sports-bracket-safe'],
  rts: ['team-bracket-safe'],
};

function resolveGenre(category: string, isBr: boolean): GameGenre {
  if (isBr) return 'br';
  const normalized = category.trim().toLowerCase();
  return CATEGORY_GENRE[normalized] ?? 'fps';
}

function buildContextFromCatalog(gameName: string): GameContext | undefined {
  const game = getGameByName(gameName);
  if (!game) return undefined;

  const isBr = game.type === 'battle_royale';
  const genre = resolveGenre(game.category, isBr);
  const teamSize = getDefaultTeamSize(gameName);
  const defaultStructure = game.tournamentCapabilities?.defaultStructure ?? 'single_elimination';

  return {
    genre,
    defaultTeamSize: teamSize,
    defaultFormat: defaultStructure,
    suggestedTemplateIds: TEMPLATE_BY_GENRE[genre],
    hasMapVeto: Boolean(game.features?.mapVeto),
    hasPickBan: false,
    scoringType: isBr ? 'placement' : 'match_wins',
    isTeamGame: teamSize > 1,
    isBattleRoyale: isBr,
  };
}

export function getGameContext(gameName: string): GameContext | undefined {
  return buildContextFromCatalog(gameName);
}

export function getGameGenre(gameName: string): GameGenre | undefined {
  return getGameContext(gameName)?.genre;
}

export function getSuggestedTemplates(gameName: string): string[] {
  return getGameContext(gameName)?.suggestedTemplateIds ?? [];
}

export function isBattleRoyaleGame(gameName: string): boolean {
  return getGameContext(gameName)?.isBattleRoyale ?? false;
}

export function getGamesByGenre(genre: GameGenre): string[] {
  return listCatalogGames()
    .filter((game) => resolveGenre(game.category, game.type === 'battle_royale') === genre)
    .map((game) => game.name);
}

export const GENRE_LABELS: Record<GameGenre, string> = {
  fps: 'FPS',
  moba: 'MOBA',
  br: 'Battle Royale',
  fighter: 'Fighting',
  sports: 'Sports',
  rts: 'RTS',
};
