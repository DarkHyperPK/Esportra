import type { CatalogGameRole } from '@/types/competitive';

/** Staff roles are LFG-wide and do not modify the game's player-role catalog. */
export function withLfgStaffRoles(game: string, roles: CatalogGameRole[]): CatalogGameRole[] {
  if (!game) return roles;
  const canonicalRoles = roles.map(role => ['coach', 'manager'].includes(role.roleKey.toLowerCase())
    ? { ...role, roleKey: role.roleKey.toLowerCase() } : role);
  const keys = new Set(canonicalRoles.map(role => role.roleKey.toLowerCase()));
  const staff = ['coach', 'manager'].filter(key => !keys.has(key)).map((roleKey, index) => ({
    id: `lfg-${roleKey}`, gameSlug: game, roleKey,
    displayName: roleKey === 'coach' ? 'Coach' : 'Manager', sortOrder: 10000 + index, iconUrl: null,
  }));
  return [...canonicalRoles, ...staff];
}
