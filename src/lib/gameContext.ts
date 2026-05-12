/**
 * gameContext.ts — Maps games to genre metadata, default configs, and suggested season templates.
 *
 * This drives the template-selection step in season creation.
 */

export type GameGenre = 'fps' | 'moba' | 'br' | 'fighter' | 'sports' | 'rts';

export interface GameContext {
  genre: GameGenre;
  defaultTeamSize: number;
  defaultFormat: string;            // e.g. 'single_elimination', 'swiss'
  suggestedTemplateIds: string[];   // IDs from seasonTemplates.ts
  hasMapVeto: boolean;
  hasPickBan: boolean;
  scoringType: 'placement' | 'match_wins' | 'kill_based';
  isTeamGame: boolean;
  isBattleRoyale: boolean;
}

const GAME_CONTEXT: Record<string, GameContext> = {
  'Valorant': {
    genre: 'fps',
    defaultTeamSize: 5,
    defaultFormat: 'double_elimination',
    suggestedTemplateIds: ['team-bracket-safe'],
    hasMapVeto: true,
    hasPickBan: false,
    scoringType: 'match_wins',
    isTeamGame: true,
    isBattleRoyale: false,
  },
  'Counter-Strike 2': {
    genre: 'fps',
    defaultTeamSize: 5,
    defaultFormat: 'double_elimination',
    suggestedTemplateIds: ['team-bracket-safe'],
    hasMapVeto: true,
    hasPickBan: false,
    scoringType: 'match_wins',
    isTeamGame: true,
    isBattleRoyale: false,
  },
  'League of Legends': {
    genre: 'moba',
    defaultTeamSize: 5,
    defaultFormat: 'double_elimination',
    suggestedTemplateIds: ['team-bracket-safe'],
    hasMapVeto: false,
    hasPickBan: true,
    scoringType: 'match_wins',
    isTeamGame: true,
    isBattleRoyale: false,
  },
  'Dota 2': {
    genre: 'moba',
    defaultTeamSize: 5,
    defaultFormat: 'double_elimination',
    suggestedTemplateIds: ['team-bracket-safe'],
    hasMapVeto: false,
    hasPickBan: true,
    scoringType: 'match_wins',
    isTeamGame: true,
    isBattleRoyale: false,
  },
  'Fortnite': {
    genre: 'br',
    defaultTeamSize: 1,
    defaultFormat: 'battle_royale',
    suggestedTemplateIds: ['br-safe'],
    hasMapVeto: false,
    hasPickBan: false,
    scoringType: 'placement',
    isTeamGame: false,
    isBattleRoyale: true,
  },
  'Apex Legends': {
    genre: 'br',
    defaultTeamSize: 3,
    defaultFormat: 'battle_royale',
    suggestedTemplateIds: ['br-safe'],
    hasMapVeto: false,
    hasPickBan: false,
    scoringType: 'placement',
    isTeamGame: true,
    isBattleRoyale: true,
  },
  'PUBG': {
    genre: 'br',
    defaultTeamSize: 4,
    defaultFormat: 'battle_royale',
    suggestedTemplateIds: ['br-safe'],
    hasMapVeto: false,
    hasPickBan: false,
    scoringType: 'placement',
    isTeamGame: true,
    isBattleRoyale: true,
  },
  'Rocket League': {
    genre: 'sports',
    defaultTeamSize: 3,
    defaultFormat: 'swiss',
    suggestedTemplateIds: ['sports-bracket-safe'],
    hasMapVeto: false,
    hasPickBan: false,
    scoringType: 'match_wins',
    isTeamGame: true,
    isBattleRoyale: false,
  },
  'Tekken 8': {
    genre: 'fighter',
    defaultTeamSize: 1,
    defaultFormat: 'double_elimination',
    suggestedTemplateIds: ['fighter-safe'],
    hasMapVeto: false,
    hasPickBan: false,
    scoringType: 'match_wins',
    isTeamGame: false,
    isBattleRoyale: false,
  },
  'EA FC': {
    genre: 'sports',
    defaultTeamSize: 1,
    defaultFormat: 'single_elimination',
    suggestedTemplateIds: ['sports-bracket-safe'],
    hasMapVeto: false,
    hasPickBan: false,
    scoringType: 'match_wins',
    isTeamGame: false,
    isBattleRoyale: false,
  },
};

/** Get context for a game by name (case-insensitive) */
export function getGameContext(gameName: string): GameContext | undefined {
  const key = Object.keys(GAME_CONTEXT).find(
    (k) => k.toLowerCase() === gameName.toLowerCase()
  );
  return key ? GAME_CONTEXT[key] : undefined;
}

/** Get genre for a game */
export function getGameGenre(gameName: string): GameGenre | undefined {
  return getGameContext(gameName)?.genre;
}

/** Get suggested template IDs for a game */
export function getSuggestedTemplates(gameName: string): string[] {
  return getGameContext(gameName)?.suggestedTemplateIds ?? [];
}

/** Check if a game is Battle Royale */
export function isBattleRoyaleGame(gameName: string): boolean {
  return getGameContext(gameName)?.isBattleRoyale ?? false;
}

/** Get all games that match a genre */
export function getGamesByGenre(genre: GameGenre): string[] {
  return Object.entries(GAME_CONTEXT)
    .filter(([, ctx]) => ctx.genre === genre)
    .map(([name]) => name);
}

/** Genre labels for display */
export const GENRE_LABELS: Record<GameGenre, string> = {
  fps: 'FPS',
  moba: 'MOBA',
  br: 'Battle Royale',
  fighter: 'Fighting',
  sports: 'Sports',
  rts: 'RTS',
};

export default GAME_CONTEXT;
