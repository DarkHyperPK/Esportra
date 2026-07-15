import type { BRLobbyFormationConfig } from '@/types/battleRoyale';
import type { BRRound } from '@/types/brLobbies';
import { generateBrSchedule } from '@/utils/brScheduleGenerator';

/** Strip "Group " prefix → A, B, … */
export const seedGroupShortLabel = (name: string): string =>
  name.replace(/^group\s+/i, '').trim() || name;

/** User-facing round label, e.g. "Round 1" (non-rotation contexts). */
export const formatRoundLabel = (roundNumber: number): string => `Round ${roundNumber}`;

/** One round-robin wave: each group pairing plays once per matchday (not a scored game). */
export const formatRotationMatchdayLabel = (matchday: number): string => `Matchday ${matchday}`;

export interface GroupRotationScheduleSummary {
  matchdayCount: number;
  matchesPerMatchday: number;
  totalCrossGroupMatches: number;
  gamesPerMatch: number;
  title: string;
  subtitle: string;
  notDoubleRoundRobinNote: string;
}

/** Single round-robin at seed-group level (circle method). Not double round-robin. */
export function summarizeGroupRotationSchedule(
  seedGroupCount: number,
  gamesPerMatch: number,
): GroupRotationScheduleSummary {
  const matchdayCount = Math.max(0, seedGroupCount - 1);
  const matchesPerMatchday = seedGroupCount >= 2 ? seedGroupCount / 2 : 0;
  let totalCrossGroupMatches = matchdayCount * matchesPerMatchday;
  if (seedGroupCount >= 2) {
    try {
      totalCrossGroupMatches = generateBrSchedule({ seedGroupCount }).totalLobbies;
    } catch {
      /* keep estimate */
    }
  }

  return {
    matchdayCount,
    matchesPerMatchday,
    totalCrossGroupMatches,
    gamesPerMatch,
    title: `Single round-robin · ${matchdayCount} matchday${matchdayCount === 1 ? '' : 's'}`,
    subtitle: `${matchesPerMatchday} cross-group match${matchesPerMatchday === 1 ? '' : 'es'} per matchday · ${gamesPerMatch} scored game${gamesPerMatch === 1 ? '' : 's'} per match (same roster)`,
    notDoubleRoundRobinNote: 'Each group pairing meets once — not double round-robin.',
  };
}

export function formatRotationMatchLabel(matchday: number, pairingLabel: string): string {
  const pairing = pairingLabel.includes('+')
    ? formatMatchPairingFromLabel(pairingLabel)
    : pairingLabel;
  return `${formatRotationMatchdayLabel(matchday)} · ${pairing}`;
}

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

/** Prefer linked seed groups on the lobby row; fall back to schedule index. */
export function resolveMatchupLabelFromLobby(
  lobby: BRRound,
  groups: Array<{ id: string; name: string }>,
  formation?: BRLobbyFormationConfig | null,
  seedGroupCount?: number,
): string {
  const linkedIds = lobby.group_ids ?? [];
  if (linkedIds.length >= 2) {
    const labels = linkedIds
      .map((id) => groups.find((g) => g.id === id))
      .filter((g): g is { id: string; name: string } => Boolean(g))
      .map((g) => seedGroupShortLabel(g.name))
      .sort();
    if (labels.length >= 2) {
      return formatMatchPairing(labels);
    }
  }

  const raw = resolveLobbyMatchupLabel(
    lobby.wave_number ?? lobby.round_number ?? 1,
    lobby.lobby_index ?? 0,
    formation,
    seedGroupCount ?? groups.length,
  );
  return formatMatchPairingFromLabel(raw);
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
