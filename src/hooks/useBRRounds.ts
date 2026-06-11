import {
  useBRCompletedLobbyResults,
  useBRLobbies,
  useBRLobbyEvidence,
  useBRLobbyResults,
} from '@/hooks/useBRLobbies';

// Backward-compatible aliases while the UI migrates naming from rounds -> lobbies.
export const useBRRounds = useBRLobbies;
export const useBRRoundResults = useBRLobbyResults;
export const useBRCompletedRoundResults = useBRCompletedLobbyResults;
export const useBRRoundEvidence = useBRLobbyEvidence;
