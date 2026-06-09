import { useMemo } from 'react';
import { getGameByName, getDefaultTeamSize, getParticipantMode, isBattleRoyale } from '@/utils/gameFeatures';

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
export function useGameTerminology(
  gameName: string | undefined,
  modeKey?: string | null,
  participantMode?: 'solo' | 'team' | string | null,
): GameTerminology {
  return useMemo(() => {
    if (!gameName) return DEFAULT_TERMINOLOGY;
    return getGameTerminology(gameName, modeKey, participantMode);
  }, [gameName, modeKey, participantMode]);
}

/** Pure function version for non-hook contexts */
export function getGameTerminology(
  gameName: string,
  modeKey?: string | null,
  participantMode?: 'solo' | 'team' | string | null,
): GameTerminology {
  const game = getGameByName(gameName);
  const isSolo = participantMode === 'solo'
    || (participantMode !== 'team' && getParticipantMode(gameName, modeKey) === 'solo');
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
