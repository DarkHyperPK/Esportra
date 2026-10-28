import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LfgConversationReference } from '@/types/messaging';

export function LfgMessageReference({ reference }: { reference: LfgConversationReference }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const image = reference.bannerUrl || reference.imageUrl;
  const team = ['looking_for_player', 'competitive_roster'].includes(reference.intent);
  const params = new URLSearchParams({ game: reference.gameSlug, kind: team ? 'teams' : 'players', listing: reference.listingId });
  return <Link className="inbox-lfg-reference" to={`/competitive/lfg?${params}`}>
    {image && image !== failedImage && <img src={image} alt="" loading="lazy" onError={() => setFailedImage(image)} />}
    <span className="inbox-lfg-copy"><small>Connected through this listing</small><strong>{reference.name}</strong><span>{reference.gameSlug.replace(/-/g, ' ')} · {team ? 'Recruiting players' : reference.intent === 'looking_for_team' ? 'Looking for a team' : 'Finding teammates'}</span>{reference.description && <p>{reference.description}</p>}</span>
    <ArrowUpRight size={16} aria-hidden />
  </Link>;
}
