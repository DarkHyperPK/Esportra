import type { BRLobbyFormationConfig } from '@/types/battleRoyale';
import type { BRRound } from '@/types/brLobbies';
import { generateBrSchedule } from '@/utils/brScheduleGenerator';

/** Strip "Group " prefix → A, B, … */
export const seedGroupShortLabel = (name: string): string =>
  name.replace(/^group\s+/i, '').trim() || name;

/** User-facing round label, e.g. "Round 1" */
export const formatRoundLabel = (roundNumber: number): string => `Round ${roundNumber}`;

/** Pairing display, e.g. ["A", "B"] → "Group A + Group B" */
export function formatMatchPairing(labels: string[]): string {
  return labels
    .map((label) => {
      const trimmed = label.trim();
      if (/^group\s/i.test(trimmed)) return trimmed;
      return `Group ${trimmed}`;
    })
    .join(' + ');
}

/** Normalize stored matchup label (A + B) to display form */
export function formatMatchPairingFromLabel(label: string): string {
  if (!label.includes('+')) return label;
  return formatMatchPairing(label.split('+').map((part) => part.trim()));
}

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
