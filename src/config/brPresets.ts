import type { BRStageConfig } from '@/types/battleRoyale';
import { getBRMapPool } from '@/utils/gameFeatures';

export interface BRStageTemplateStage {
  name: string;
  capacity: number | null;
  advancementCount: number | null;
  config?: { br?: BRStageConfig };
}

export interface BRStageTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  teamRange: string;
  minTeams: number;
  maxTeams: number;
  stages: BRStageTemplateStage[];
  /** When set, only shown for matching game slugs/names. */
  gameFilter?: string[];
}

function genericTemplates(lobbySize: number | null, unitsLabel: string): BRStageTemplate[] {
  const L = lobbySize ?? 20;
  const half = Math.max(1, Math.floor(L / 2));
  const twoThirds = Math.max(1, Math.floor((L * 2) / 3));

  return [
    {
      id: 'generic_single_lobby',
      name: 'Single Lobby',
      description: `All ${unitsLabel} in one lobby. Best for small events that fit within a single game session.`,
      icon: '',
      teamRange: `4–${L} ${unitsLabel}`,
      minTeams: 4,
      maxTeams: L,
      stages: [{ name: 'Main Event', capacity: null, advancementCount: null }],
    },
    {
      id: 'generic_qualifier_finals',
      name: 'Qualifier → Finals',
      description: `2-stage format. ${unitsLabel} compete across qualifier lobbies; top performers advance to a single finals lobby.`,
      icon: '',
      teamRange: `${L + 1}–${L * 3} ${unitsLabel}`,
      minTeams: L + 1,
      maxTeams: L * 3,
      stages: [
        { name: 'Qualifiers', capacity: L, advancementCount: half },
        { name: 'Grand Finals', capacity: null, advancementCount: null },
      ],
    },
    {
      id: 'generic_groups_semis_finals',
      name: 'Dual Group → Finals',
      description: `2 parallel groups compete separately; top ${unitsLabel} from each merge into one finals lobby.`,
      icon: '',
      teamRange: `${L + 1}–${L * 2} ${unitsLabel}`,
      minTeams: L + 1,
      maxTeams: L * 2,
      stages: [
        { name: 'Group Stage', capacity: L, advancementCount: half },
        { name: 'Grand Finals', capacity: null, advancementCount: null },
      ],
    },
    {
      id: 'generic_full_circuit',
      name: 'Groups → Semis → Finals',
      description: `3-stage progression. Large pool narrows through semi-finals into a single finals lobby.`,
      icon: '',
      teamRange: `${L * 2 + 1}–${L * 5} ${unitsLabel}`,
      minTeams: L * 2 + 1,
      maxTeams: L * 5,
      stages: [
        { name: 'Group Stage', capacity: L, advancementCount: half },
        { name: 'Semi-Finals', capacity: L, advancementCount: twoThirds },
        { name: 'Grand Finals', capacity: null, advancementCount: null },
      ],
    },
  ];
}

function apexAlgsPreset(lobbySize: number, unitsLabel: string): BRStageTemplate {
  const pool = getBRMapPool('Apex Legends');
  return {
    id: 'apex_algs',
    name: 'Apex ALGS',
    description: 'ALGS-style scoring with map rotation. Qualifiers into a single finals lobby.',
    icon: '',
    teamRange: `${lobbySize + 1}–${lobbySize * 3} ${unitsLabel}`,
    minTeams: lobbySize + 1,
    maxTeams: lobbySize * 3,
    gameFilter: ['apex legends', 'apex'],
    stages: [
      {
        name: 'Qualifiers',
        capacity: lobbySize,
        advancementCount: Math.max(1, Math.floor(lobbySize / 2)),
        config: {
          br: {
            gameCount: 6,
            scoring: { presetKey: 'algs', killCap: 6 },
            map: { mode: 'rotation', pool, fixedMap: null },
          },
        },
      },
      {
        name: 'Grand Finals',
        capacity: null,
        advancementCount: null,
        config: {
          br: {
            gameCount: 6,
            scoring: { presetKey: 'algs', killCap: 6 },
            map: { mode: 'rotation', pool, fixedMap: null },
          },
        },
      },
    ],
  };
}

function fortniteFncsPreset(lobbySize: number, unitsLabel: string): BRStageTemplate {
  return {
    id: 'fortnite_fncs',
    name: 'Fortnite FNCS Heats',
    description: 'FNCS scoring with parallel heat groups advancing to a single final lobby.',
    icon: '',
    teamRange: `${lobbySize + 1}–${lobbySize * 2} ${unitsLabel}`,
    minTeams: lobbySize + 1,
    maxTeams: lobbySize * 2,
    gameFilter: ['fortnite'],
    stages: [
      {
        name: 'Heats',
        capacity: lobbySize,
        advancementCount: Math.max(1, Math.floor(lobbySize / 2)),
        config: {
          br: {
            gameCount: 6,
            scoring: { presetKey: 'fncs' },
            map: { mode: 'none', pool: [], fixedMap: null },
          },
        },
      },
      {
        name: 'Grand Finals',
        capacity: null,
        advancementCount: null,
        config: {
          br: {
            gameCount: 6,
            scoring: { presetKey: 'fncs' },
            map: { mode: 'none', pool: [], fixedMap: null },
          },
        },
      },
    ],
  };
}

function pubgPcsBasicPreset(lobbySize: number, unitsLabel: string): BRStageTemplate {
  const pool = getBRMapPool('PUBG');
  return {
    id: 'pubg_pcs_basic',
    name: 'PUBG PCS Basic',
    description: 'PCS scoring with map rotation across qualifier groups into a finals lobby.',
    icon: '',
    teamRange: `${lobbySize + 1}–${lobbySize * 3} ${unitsLabel}`,
    minTeams: lobbySize + 1,
    maxTeams: lobbySize * 3,
    gameFilter: ['pubg', 'pubg: battlegrounds'],
    stages: [
      {
        name: 'Group Stage',
        capacity: lobbySize,
        advancementCount: Math.max(1, Math.floor(lobbySize / 2)),
        config: {
          br: {
            gameCount: 6,
            scoring: { presetKey: 'pcs' },
            map: { mode: 'rotation', pool, fixedMap: null },
          },
        },
      },
      {
        name: 'Grand Finals',
        capacity: null,
        advancementCount: null,
        config: {
          br: {
            gameCount: 6,
            scoring: { presetKey: 'pcs' },
            map: { mode: 'rotation', pool, fixedMap: null },
          },
        },
      },
    ],
  };
}

function normalizeGameKey(gameName?: string | null): string {
  return (gameName ?? '').trim().toLowerCase();
}

function matchesGameFilter(gameName: string | null | undefined, filter?: string[]): boolean {
  if (!filter?.length) return true;
  const key = normalizeGameKey(gameName);
  return filter.some((entry) => key.includes(entry) || entry.includes(key));
}

/** Generic + game-specific BR stage templates for the organizer template picker. */
export function getBRTemplates(
  lobbySize: number | null,
  unitsLabel: string,
  gameName?: string | null,
): BRStageTemplate[] {
  const L = lobbySize ?? 20;
  const generic = genericTemplates(lobbySize, unitsLabel);

  const gamePresets: BRStageTemplate[] = [
    apexAlgsPreset(L, unitsLabel),
    fortniteFncsPreset(L, unitsLabel),
    pubgPcsBasicPreset(L, unitsLabel),
  ].filter((preset) => matchesGameFilter(gameName, preset.gameFilter));

  return [...generic, ...gamePresets];
}
