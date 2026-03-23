import { useMemo } from 'react';
import { getGameByName, getDefaultTeamSize, isBattleRoyale } from '@/utils/gameFeatures';

export interface GameTerminology {
  competitorLabel: string;
  competitorLabelPlural: string;
  matchLabel: string;
  matchLabelPlural: string;
  scoreLabel: string;
  registrationLabel: string;
  isSolo: boolean;
  isFighting: boolean;
  isBR: boolean;
}

/** Returns context-aware terminology for a game (e.g. "Player" vs "Team", "Set" vs "Match") */
export function useGameTerminology(gameName: string | undefined): GameTerminology {
  return useMemo(() => {
    if (!gameName) return DEFAULT_TERMINOLOGY;
    return getGameTerminology(gameName);
  }, [gameName]);
}

/** Pure function version for non-hook contexts */
export function getGameTerminology(gameName: string): GameTerminology {
  const game = getGameByName(gameName);
  const teamSize = getDefaultTeamSize(gameName);
  const isSolo = teamSize === 1;
  const isFighting = game?.category === 'Fighting';
  const isBR = isBattleRoyale(gameName);

  return {
    competitorLabel: isSolo ? 'Player' : 'Team',
    competitorLabelPlural: isSolo ? 'Players' : 'Teams',
    matchLabel: isFighting ? 'Set' : 'Match',
    matchLabelPlural: isFighting ? 'Sets' : 'Matches',
    scoreLabel: isFighting ? 'Games Won' : 'Score',
    registrationLabel: isSolo ? 'Register' : 'Register Team',
    isSolo,
    isFighting,
    isBR,
  };
}

const DEFAULT_TERMINOLOGY: GameTerminology = {
  competitorLabel: 'Team',
  competitorLabelPlural: 'Teams',
  matchLabel: 'Match',
  matchLabelPlural: 'Matches',
  scoreLabel: 'Score',
  registrationLabel: 'Register Team',
  isSolo: false,
  isFighting: false,
  isBR: false,
};
