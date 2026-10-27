export function resolveLfgAvatar(profileAvatarUrl?: string | null, seed?: string | null, style?: string | null): string | null {
  if (profileAvatarUrl?.trim()) return profileAvatarUrl;
  if (!seed?.trim()) return null;
  return `https://api.dicebear.com/10.x/${encodeURIComponent(style?.trim() || 'critters')}/svg?seed=${encodeURIComponent(seed)}`;
}
