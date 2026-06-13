/** Shared BR stage flow calculations for setup wizard and management tab. */

import { getStageBRConfig } from '@/utils/brConfigResolve';
import type { BRStageConfig } from '@/types/battleRoyale';

import {
  countBRSeedEligibleParticipants,
  getBRSeedEligibleStatuses,
  hasRegisteredParticipantsAwaitingCheckIn,
} from '@/utils/brCheckIn';

export const BR_SEED_ELIGIBLE_STATUSES = ['approved', 'checked_in'] as const;

export function countBRSeedEligibleParticipantsFromList(
  participants: Array<{ status?: string | null; checked_in_at?: string | null }> | null | undefined,
  checkInRequired = false,
): number {
  return countBRSeedEligibleParticipants(participants, checkInRequired);
}

export { getBRSeedEligibleStatuses };

/**
 * BR lobby/schedule math should follow registered players when the field is smaller
 * than tournament capacity. Falls back to max teams only when nobody is eligible yet.
 */
export function resolveBRRegisteredUnitCount(
  participants: Array<{ status?: string | null; checked_in_at?: string | null }> | null | undefined,
  maxTeams = 0,
  checkInRequired = false,
): number {
  const eligible = countBRSeedEligibleParticipants(participants, checkInRequired);
  if (eligible > 0) return eligible;
  // Registered but waiting on check-in — don't fall back to tournament capacity.
  if (checkInRequired && hasRegisteredParticipantsAwaitingCheckIn(participants)) return 0;
  return Math.max(0, maxTeams);
}

export interface BrStageFlowInfo {
  teamsEntering: number;
  groupsFormed: number;
  teamsAdvancing: number | null;
  isFinal: boolean;
  isConfigured: boolean;
}

export type StageFlowInput = {
  capacity: number | null;
  advancement_count: number | null;
  config?: unknown;
};

function resolveLobbyCount(
  stage: StageFlowInput,
  teamsEntering: number,
  br: BRStageConfig | null,
): number {
  const formation = br?.lobbyFormation;
  if (formation?.lobbyCount != null && formation.lobbyCount > 0) {
    return formation.lobbyCount;
  }
  if (formation?.seedGroupCount != null && formation.seedGroupCount > 0) {
    return formation.seedGroupCount;
  }
  if (stage.capacity && stage.capacity > 0 && teamsEntering > 0) {
    return Math.ceil(teamsEntering / stage.capacity);
  }
  return 1;
}

/** How many units advance from a stage to the next, respecting advancement mode in stage config. */
export function computeOutgoingFromStage(
  stage: StageFlowInput,
  teamsEntering: number,
): number | null {
  const advCount = stage.advancement_count;
  if (advCount == null || advCount <= 0) return null;

  const br = getStageBRConfig(stage);
  const advancement = br?.advancement;

  if (advancement?.mode === 'none') return null;

  const format = br?.format;
  const mode =
    advancement?.mode
    ?? (format === 'group_rotation' ? 'top_n_overall' : 'top_n_per_group');

  if (mode === 'top_n_overall') {
    return advancement?.overall ?? advCount;
  }

  const lobbyCount = resolveLobbyCount(stage, teamsEntering, br);

  if (mode === 'top_n_per_lobby') {
    const perLobby = advancement?.perLobby ?? advCount;
    return perLobby * lobbyCount;
  }

  const perGroup = advancement?.perGroup ?? advCount;
  return perGroup * lobbyCount;
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
  stages: Array<{ id: string; capacity: number | null; advancement_count: number | null; config?: unknown }>,
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
    const teamsAdvancing = isFinal
      ? null
      : computeOutgoingFromStage(stage, teamsEntering);
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
