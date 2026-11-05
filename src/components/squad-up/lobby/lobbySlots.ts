import { resolveLfgAvatar } from '@/lib/lfgAvatar';
import type { Lobby } from '@/schemas/squadUpLobby';
import type { RailSlot } from '../shared/LobbyRail';

const label = (key?: string | null) => (key ? key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ') : null);
export const roleLabel = label;

/** Host + accepted players + open slots, as a 5-stack rail (host counts as one of the five). */
export function lobbyRail(lobby: Lobby, myId?: string | null): { slots: (RailSlot | null)[]; wanted: string[] } {
  const filled: RailSlot[] = [
    { name: lobby.hostUsername ?? 'Host', avatarUrl: resolveLfgAvatar(lobby.hostAvatarUrl, lobby.hostAvatarSeed, lobby.hostAvatarStyle), role: 'Host', you: lobby.hostId === myId },
    ...lobby.membersJson.map((member) => ({
      name: member.username ?? 'Player', avatarUrl: resolveLfgAvatar(member.avatar_url, member.avatar_seed, member.avatar_style),
      role: label(member.role_key), you: member.user_id === myId,
    })),
  ];
  const open = Math.max(0, lobby.openSlots - lobby.acceptedCount);
  const total = Math.min(5, filled.length + open);
  const slots = Array.from({ length: Math.max(total, 1) }, (_, i) => filled[i] ?? null);
  const taken = new Set(lobby.membersJson.map((member) => member.role_key));
  const wanted = lobby.wantedRoles.filter((role) => !taken.has(role)).map((role) => label(role) ?? role);
  return { slots, wanted };
}
