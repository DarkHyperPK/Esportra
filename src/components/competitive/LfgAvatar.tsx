import { useState } from 'react';
import type { LfgListing } from '@/types/competitive';
import { resolveLfgAvatar } from '@/lib/lfgAvatar';

export function LfgAvatar({ listing, name }: { listing: LfgListing; name: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const team = listing.intent !== 'looking_for_team';
  const source = team ? listing.teamLogoUrl : resolveLfgAvatar(listing.profileAvatarUrl, listing.avatarSeed, listing.avatarStyle);
  return <span className={`lfg-avatar ${team ? 'team' : ''}`}>
    {source && source !== failedSource ? <img src={source} alt="" onError={() => setFailedSource(source)} /> : name.slice(0, 2).toUpperCase()}
  </span>;
}
