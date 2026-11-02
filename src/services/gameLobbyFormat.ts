/**
 * Per-game lobby field labels and hints for scrim session match rooms.
 * Consumed by the Match Room page (T13) and Workspace session cards.
 */

export interface LobbyFieldFormat {
  fieldOneLabel: string;
  fieldOneHint: string;
  /** Null when the game has a single lobby identifier (e.g. a party code). */
  fieldTwo: { label: string; hint: string } | null;
  /** Uppercase the first field as the player types (party codes). */
  fieldOneUppercase?: boolean;
}

export const GAME_LOBBY_FORMAT: Record<string, LobbyFieldFormat> = {
  valorant: {
    fieldOneLabel: 'Party code',
    fieldOneHint: 'Paste the VALORANT party code',
    fieldTwo: null,
    fieldOneUppercase: true,
  },
  cs2: {
    fieldOneLabel: 'Connect IP',
    fieldOneHint: 'e.g. connect 192.168.1.1:27015',
    fieldTwo: { label: 'Password', hint: 'sv_password value' },
  },
};

export const FALLBACK_LOBBY_FORMAT: LobbyFieldFormat = {
  fieldOneLabel: 'Lobby Code',
  fieldOneHint: 'Share with your opponent',
  fieldTwo: { label: 'Password', hint: 'Leave blank if no password' },
};

/**
 * Returns the field labels/hints for a given game slug.
 * Falls back to generic labels when no specific config exists.
 */
export function getLobbyFormat(gameSlug: string): LobbyFieldFormat {
  return GAME_LOBBY_FORMAT[gameSlug] ?? FALLBACK_LOBBY_FORMAT;
}
