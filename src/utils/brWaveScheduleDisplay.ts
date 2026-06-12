import type { BRLobbyFormationConfig } from '@/types/battleRoyale';
import type { BRRound } from '@/types/brLobbies';
import { generateBrSchedule } from '@/utils/brScheduleGenerator';

/** Strip "Group " prefix → A, B, … */
export const seedGroupShortLabel = (name: string): string =>
  name.replace(/^group\s+/i, '').trim() || name;

export function resolveLobbyMatchupLabel(
  waveNumber: number,
  lobbyIndex: number,
  formation: BRLobbyFormationConfig | null | undefined,
  seedGroupCount: number,
): string {
  const waves = formation?.matchupSchedule;
  if (Array.isArray(waves)) {
    const wave = waves.find((w) => w.wave === waveNumber);
    const pairing = wave?.lobbies?.[lobbyIndex];
    if (pairing?.length) {
      return pairing.join(' + ');
    }
  }

  if (seedGroupCount >= 2) {
    try {
      const manifest = generateBrSchedule({ seedGroupCount });
      const wave = manifest.waves.find((w) => w.wave === waveNumber);
      const pairing = wave?.lobbies?.[lobbyIndex];
      if (pairing?.length) {
        return pairing.join(' + ');
      }
    } catch {
      /* fall through */
    }
  }

  return `Lobby ${lobbyIndex + 1}`;
}

export function groupLobbiesByWave(lobbies: BRRound[]): Map<number, BRRound[]> {
  const map = new Map<number, BRRound[]>();
  for (const lobby of lobbies) {
    const wave = lobby.wave_number ?? lobby.round_number ?? 1;
    const list = map.get(wave) ?? [];
    list.push(lobby);
    map.set(wave, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => (a.lobby_index ?? 0) - (b.lobby_index ?? 0));
  }
  return new Map([...map.entries()].sort(([a], [b]) => a - b));
}
