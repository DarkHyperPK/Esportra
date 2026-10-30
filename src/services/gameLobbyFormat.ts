/**
 * Per-game lobby field labels and hints for scrim session match rooms.
 * Consumed by the Match Room page (T13) and Workspace session cards.
 */

export interface LobbyFieldFormat {
  fieldOneLabel: string;
  fieldOneHint: string;
  fieldTwoLabel: string;
  fieldTwoHint: string;
}

export const GAME_LOBBY_FORMAT: Record<string, LobbyFieldFormat> = {
  valorant: {
    fieldOneLabel: 'Lobby Name',
    fieldOneHint: 'Custom lobby name visible in VALORANT',
    fieldTwoLabel: 'Password',
    fieldTwoHint: 'Set a password so only invited players can join',
  },
  cs2: {
    fieldOneLabel: 'Connect IP',
    fieldOneHint: 'e.g. connect 192.168.1.1:27015',
    fieldTwoLabel: 'Password',
    fieldTwoHint: 'sv_password value',
  },
};

export const FALLBACK_LOBBY_FORMAT: LobbyFieldFormat = {
  fieldOneLabel: 'Lobby Code',
  fieldOneHint: 'Share with your opponent',
  fieldTwoLabel: 'Password',
  fieldTwoHint: 'Leave blank if no password',
};

/**
 * Returns the field labels/hints for a given game slug.
 * Falls back to generic labels when no specific config exists.
 */
export function getLobbyFormat(gameSlug: string): LobbyFieldFormat {
  return GAME_LOBBY_FORMAT[gameSlug] ?? FALLBACK_LOBBY_FORMAT;
}
