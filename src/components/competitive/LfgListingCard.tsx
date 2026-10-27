import { ArrowRight, Bookmark } from 'lucide-react';
import type { CatalogGameRole, LfgListing } from '@/types/competitive';
import { getAgentPortraitUrl, parsePopularAgents } from '@/lib/valorantAgents';
import { getRankIconUrl } from '@/lib/valorantRanks';
import { LfgAvatar } from './LfgAvatar';

export function LfgListingCard({ listing, roles, artwork, selected, onSelect, onSave, savePending, isOwn }: {
  listing: LfgListing; roles: CatalogGameRole[]; artwork?: string | null; selected: boolean;
  onSelect: () => void; onSave: () => void; savePending: boolean; isOwn: boolean;
}) {
  const team = listing.intent !== 'looking_for_team';
  const name = (team ? listing.teamName : listing.username) || 'Player';
  const rank = listing.competitiveTierName || listing.minRankDisplayName || 'Any rank';
  const role = (listing.preferredRoles ?? []).map(key => roles.find(item => item.roleKey === key)?.displayName ?? key);
  const agent = listing.gameSlug === 'valorant' ? parsePopularAgents(listing.popularAgents)[0]?.agentId || listing.preferredAgents?.[0] : null;
  const rankIcon = listing.gameSlug === 'valorant' && listing.competitiveTier != null
    ? getRankIconUrl(listing.competitiveTier - 3) : listing.minRankIconUrl;
  const posted = listing.createdAt ? new Date(listing.createdAt).toLocaleDateString() : '';
  return (
    <article className={`lfg-card lfg-panel ${selected ? 'selected' : ''}`}>
      <div className="lfg-card-art">
        {artwork && <img src={artwork} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} />}
        {agent && <img className="lfg-agent-art" src={getAgentPortraitUrl(agent)} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} />}
        <span className="lfg-card-kind">{team ? 'TEAM · RECRUITING' : 'PLAYER · LOOKING FOR TEAM'}</span>
        {!isOwn && <button type="button" className="lfg-save" aria-label={`${listing.isSaved ? 'Unsave' : 'Save'} ${name}`} aria-pressed={!!listing.isSaved} disabled={savePending} onClick={onSave}><Bookmark size={17} fill={listing.isSaved ? 'currentColor' : 'none'} /></button>}
      </div>
      <div className="lfg-card-body">
        <div className="lfg-identity"><LfgAvatar listing={listing} name={name} /><div><h2 className="lfg-name">{name}</h2><p className="lfg-sub">{team ? listing.teamTag || 'Team listing' : listing.riotGameName ? `${listing.riotGameName}#${listing.riotTagLine ?? ''}` : 'Player listing'}</p></div></div>
        <div className="lfg-stats"><div><small>{team ? 'Rank wanted' : 'Rank'}</small><strong className="lfg-rank">{rankIcon && <img src={rankIcon} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} />}{rank}</strong></div><div><small>{team ? 'Role needed' : 'K/D'}</small><strong>{team ? role[0] || 'Flexible' : listing.kdRatio != null ? Number(listing.kdRatio).toFixed(2) : '—'}</strong></div><div><small>{team ? 'Roster' : 'Win rate'}</small><strong>{team ? listing.teamMemberCount ?? '—' : listing.winRate != null ? `${Math.round(Number(listing.winRate))}%` : '—'}</strong></div></div>
        <p className="lfg-description line-clamp-2">{listing.description || 'No description provided.'}</p>
        <div className="lfg-chips">{role.slice(0, 2).map(item => <span className="lfg-chip" key={item}>{item}</span>)}{listing.regionDisplayName && <span className="lfg-chip">{listing.regionDisplayName}</span>}</div>
        <div className="lfg-card-bottom"><small>{listing.viewerInterestStatus ? `Request: ${listing.viewerInterestStatus}` : posted ? `Posted ${posted}` : ''}</small><button className="lfg-button" type="button" onClick={onSelect}>View {team ? 'team' : 'player'} <ArrowRight size={15} /></button></div>
      </div>
    </article>
  );
}
