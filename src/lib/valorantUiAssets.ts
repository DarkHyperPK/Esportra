import assets from './valorantUiAssets.json';

export interface BundledValorantAgent {
  uuid: string;
  displayName: string;
  displayIcon: string;
  role: string | null;
  roleIcon: string | null;
}

export const bundledValorantAgents: Record<string, BundledValorantAgent> = assets.agents;
export const valorantUiAssetVersion = assets.version;
const ranks: Record<string, string> = assets.ranks;
const roles: Record<string, string> = assets.roles;

export function getValorantAgentIcon(id: string, fallback?: string): string | undefined {
  return bundledValorantAgents[id.toLowerCase()]?.displayIcon || fallback;
}

export function getValorantRoleIcon(role: string): string | undefined {
  return roles[role.toLowerCase()];
}

export function getValorantRankIcon(tier: number): string | undefined {
  return ranks[String(tier)];
}
