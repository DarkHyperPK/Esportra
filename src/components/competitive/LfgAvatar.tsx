import { useState } from 'react';
import type { LfgListing } from '@/types/competitive';

export function LfgAvatar({ listing, name }: { listing: LfgListing; name: string }) {
  const [failed, setFailed] = useState(false);
  const team = listing.intent !== 'looking_for_team';
  const source = team ? listing.teamLogoUrl : listing.avatarSeed
    ? `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(listing.avatarSeed)}&size=80`
    : null;
  return <span className={`lfg-avatar ${team ? 'team' : ''}`}>
    {source && !failed ? <img src={source} alt="" onError={() => setFailed(true)} /> : name.slice(0, 2).toUpperCase()}
  </span>;
}
