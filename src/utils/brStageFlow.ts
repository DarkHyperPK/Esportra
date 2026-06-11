/** Shared BR stage flow calculations for setup wizard and management tab. */

export interface BrStageFlowInfo {
  teamsEntering: number;
  groupsFormed: number;
  teamsAdvancing: number | null;
  isFinal: boolean;
  isConfigured: boolean;
}

export function deriveLobbySize(incomingTeams: number, groupCount: number): number {
  if (incomingTeams <= 0 || groupCount <= 0) return 0;
  return Math.ceil(incomingTeams / groupCount);
}

export function deriveGroupCount(incomingTeams: number, maxLobbySize: number | null): number {
  if (incomingTeams <= 0) return 1;
  if (maxLobbySize && incomingTeams > maxLobbySize) {
    return Math.ceil(incomingTeams / maxLobbySize);
  }
  return 1;
}

export function computeStageFlows(
  stages: Array<{ id: string; capacity: number | null; advancement_count: number | null }>,
  registeredUnitCount: number,
): Map<string, BrStageFlowInfo> {
  const flows = new Map<string, BrStageFlowInfo>();
  let teamsEntering = registeredUnitCount;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const isFinal = i === stages.length - 1;
    const groupsFormed =
      stage.capacity && stage.capacity > 0
        ? Math.ceil(teamsEntering / stage.capacity)
        : 1;
    const advPerGroup = stage.advancement_count ?? null;
    const teamsAdvancing =
      advPerGroup != null && !isFinal ? advPerGroup * groupsFormed : null;
    const isConfigured = isFinal ? true : stage.advancement_count != null;

    flows.set(stage.id, {
      teamsEntering,
      groupsFormed,
      isFinal,
      teamsAdvancing,
      isConfigured,
    });

    teamsEntering = isFinal ? 0 : teamsAdvancing ?? 0;
  }

  return flows;
}

export function validateIntermediateStage(params: {
  incomingTeams: number;
  groupCount: number;
  advancementPerGroup: number;
  maxLobbySize: number | null;
  unitLabel: string;
}): string[] {
  const { incomingTeams, groupCount, advancementPerGroup, maxLobbySize, unitLabel } = params;
  const errors: string[] = [];
  const lobbySize = deriveLobbySize(incomingTeams, groupCount);

  if (groupCount < 1) errors.push('Group count must be at least 1.');
  if (advancementPerGroup < 1) errors.push('Advance per group must be at least 1.');
  if (lobbySize > 0 && advancementPerGroup >= lobbySize) {
    errors.push(
      `Top ${advancementPerGroup} per group must be less than lobby size (${lobbySize}) — at least one ${unitLabel} must be eliminated.`,
    );
  }
  if (maxLobbySize && lobbySize > maxLobbySize) {
    errors.push(
      `Lobby size ${lobbySize} exceeds game max of ${maxLobbySize}. Add more groups.`,
    );
  }
  if (incomingTeams > 0 && lobbySize <= 1 && groupCount === 1) {
    errors.push(
      `Only 1 ${unitLabel} per lobby — an intermediate stage cannot eliminate anyone. Split into groups or mark as a final stage.`,
    );
  }
  return errors;
}
