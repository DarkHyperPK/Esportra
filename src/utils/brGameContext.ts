import type { BRConfig, BRStageFormat } from '@/types/battleRoyale';

export interface BRWizardTerminology {
  isSolo: boolean;
  maxCapacityLabel: string;
  unitSingular: string;
  unitPlural: string;
  lobbyUnitsLabel: string;
  teamFormatLabel: (teamSize: number, modeName?: string) => string;
  modeCardSubtitle: (teamSize: number) => string;
  maxCapacityHint: (unitsPerLobby: number, teamSize: number) => string;
  lobbySizeHint: (unitsPerLobby: number, playersPerLobby: number, teamSize: number) => string;
}

/** Stage wizard unit labels — teams for any team mode, players for solo only. */
export function getBRStageUnitLabels(
  teamSize: number,
  participantMode?: 'solo' | 'team' | null,
): { isSolo: boolean; unitLabel: string; unitsLabel: string } {
  const terms = getBRWizardTerminology(teamSize, participantMode);
  return {
    isSolo: terms.isSolo,
    unitLabel: terms.unitSingular,
    unitsLabel: terms.lobbyUnitsLabel,
  };
}

export function formatUnitsPerLobby(count: number, unitsLabel: string): string {
  return `~${count} ${unitsLabel}/lobby`;
}

export function formatUnitsPerGroup(count: number, unitsLabel: string): string {
  return `~${count} ${unitsLabel}/group`;
}

/** Registration/capacity copy for BR wizard — teams for squad/duo, players for solo. */
export function getBRWizardTerminology(
  teamSize: number,
  participantMode?: 'solo' | 'team' | null,
): BRWizardTerminology {
  const isSolo = participantMode === 'solo' || (participantMode !== 'team' && teamSize <= 1);
  const unitSingular = isSolo ? 'player' : 'team';
  const unitPlural = isSolo ? 'players' : 'teams';

  return {
    isSolo,
    maxCapacityLabel: isSolo ? 'Maximum Players' : 'Maximum Teams',
    unitSingular,
    unitPlural,
    lobbyUnitsLabel: unitPlural,
    teamFormatLabel: (ts, modeName) => {
      if (isSolo) return 'Solo (Individual)';
      const label = modeName
        || (ts === 2 ? 'Duo' : ts === 3 ? 'Trio' : ts === 4 ? 'Squad' : 'Team');
      return `${label} (${ts} players per team)`;
    },
    modeCardSubtitle: (ts) => (isSolo || ts <= 1 ? 'Individual' : `${ts} players per team`),
    maxCapacityHint: (unitsPerLobby, ts) => (
      isSolo
        ? `Each lobby fits up to ${unitsPerLobby} players.`
        : `Each lobby fits up to ${unitsPerLobby} teams (${ts} players per team, up to ${unitsPerLobby * ts} players in the lobby).`
    ),
    lobbySizeHint: (unitsPerLobby, playersPerLobby, ts) => (
      isSolo
        ? `Suggested for this mode: ${unitsPerLobby} players per lobby (${playersPerLobby} player cap). Override here or per stage after creation.`
        : `Suggested for this mode: ${unitsPerLobby} teams per lobby (${ts} players per team, ${playersPerLobby} player cap). Override here or per stage after creation.`
    ),
  };
}

/** Default max capacity + lobby size when BR game mode changes in the wizard. */
export function deriveBRModeWizardDefaults(
  teamSize: number,
  brConfig: BRConfig,
): { brDefaultLobbySize: number; maxTeams: number } {
  const unitsPerLobby = deriveDefaultLobbyUnits(teamSize, brConfig.playersPerLobby);
  const isSolo = teamSize <= 1;
  const playerOptions = [20, 30, 40, 60, 100, 150, 200];
  const teamOptions = [8, 10, 16, 20, 30, 40, 50, 60, 100];
  const options = isSolo ? playerOptions : teamOptions;
  const target = isSolo ? unitsPerLobby * 5 : Math.max(unitsPerLobby * 4, 16);
  const maxTeams = options.find((n) => n >= target) ?? options[options.length - 1];
  return { brDefaultLobbySize: unitsPerLobby, maxTeams };
}

export interface BRGameContext {
  maxLobbySize: number;
  defaultGameCount: number;
  hasMaps: boolean;
  mapPool: string[];
  defaultMapMode: string;
}

/** Competing units per lobby from catalog player cap and team size (e.g. 100 solo, 33 trio, 25 squad). */
export const deriveDefaultLobbyUnits = (
  teamSize: number,
  playersPerLobby = 100,
): number => Math.max(1, Math.floor(playersPerLobby / Math.max(1, teamSize)));

export const deriveBRGameContext = (catalog: BRConfig | null | undefined, teamSize: number): BRGameContext => {
  const safeTeamSize = Math.max(1, teamSize || 1);
  const playersPerLobby = catalog?.playersPerLobby ?? 100;
  const maxLobbySize = deriveDefaultLobbyUnits(safeTeamSize, playersPerLobby);
  const mapPool = catalog?.maps?.pool ?? [];

  return {
    maxLobbySize,
    defaultGameCount: catalog?.defaultGameCount ?? 6,
    hasMaps: (catalog?.maps?.hasMaps ?? mapPool.length > 0) === true,
    mapPool,
    defaultMapMode: catalog?.defaultMapMode ?? 'none',
  };
};

export function formatBRStageStructureSummary(opts: {
  format: BRStageFormat | string;
  seedGroups: number;
  gamesPerLobby: number;
  lobbyCapacity?: number | null;
  unitsLabel: string;
}): { title: string; subtitle: string } {
  const { format, seedGroups, gamesPerLobby, lobbyCapacity, unitsLabel } = opts;
  const gamesText = `${gamesPerLobby} scored game${gamesPerLobby === 1 ? '' : 's'} per lobby`;
  const capText = lobbyCapacity != null && lobbyCapacity > 0
    ? ` · up to ${lobbyCapacity} ${unitsLabel} per lobby`
    : '';

  switch (format) {
    case 'single_lobby':
      return {
        title: 'One shared lobby for everyone',
        subtitle: `${gamesText}${capText}`,
      };
    case 'static_groups':
      return {
        title: `${seedGroups} group${seedGroups === 1 ? '' : 's'} — each group gets its own lobby`,
        subtitle: `${gamesText} · standings are per group`,
      };
    case 'group_rotation':
      return {
        title: `${seedGroups} groups — everyone plays each other across ${Math.max(1, seedGroups - 1)} rounds`,
        subtitle: `${gamesText} · two groups per match each round`,
      };
    case 'multi_lobby_cut':
      return {
        title: `${seedGroups} parallel cut lobby${seedGroups === 1 ? '' : 'ies'}`,
        subtitle: `${gamesText} · top finishers advance from each lobby`,
      };
    default:
      return {
        title: 'Battle Royale stage',
        subtitle: gamesText,
      };
  }
}

export const recommendBRStageFormat = (
  registeredUnits: number,
  maxLobbySize: number,
): BRStageFormat => {
  if (registeredUnits <= maxLobbySize) return 'single_lobby';
  if (registeredUnits <= maxLobbySize * 4) return 'group_rotation';
  return 'static_groups';
};
