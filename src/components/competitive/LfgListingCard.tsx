import { ArrowRight, Bookmark } from 'lucide-react';
import type { CatalogGameRole, LfgListing } from '@/types/competitive';
import { getAgentPortraitUrl, parsePopularAgents, resolveAgent } from '@/lib/valorantAgents';
import { getRankIconUrl } from '@/lib/valorantRanks';
import { LFG_LANGUAGES } from '@/lib/lfgLanguages';
import { LfgAvatar } from './LfgAvatar';

export function LfgListingCard({ listing, roles, artwork, selected, onSelect, onSave, savePending, isOwn, preview = false }: {
  listing: LfgListing; roles: CatalogGameRole[]; artwork?: string | null; selected: boolean;
  onSelect: () => void; onSave: () => void; savePending: boolean; isOwn: boolean; preview?: boolean;
}) {
  const team = listing.intent !== 'looking_for_team';
  const name = (team ? listing.teamName : listing.username) || 'Player';
  const rank = listing.competitiveTierName || listing.minRankDisplayName || 'Any rank';
  const role = (listing.preferredRoles ?? []).map(key => roles.find(item => item.roleKey === key)?.displayName ?? key);
  const popularAgents = listing.gameSlug === 'valorant' ? parsePopularAgents(listing.popularAgents) : [];
  const agentIds = listing.gameSlug === 'valorant' ? (listing.preferredAgents?.length ? listing.preferredAgents : popularAgents.map(item => item.agentId)).filter(Boolean).slice(0, 4) : [];
  const agent = agentIds[0];
  const agentNames = agentIds.map(id => resolveAgent(id)?.displayName || popularAgents.find(item => item.agentId === id)?.displayName || id);
  const languages = (listing.languages ?? []).map(code => LFG_LANGUAGES.find(item => item.code === code)?.label ?? code);
  const rankIcon = listing.gameSlug === 'valorant' && listing.competitiveTier != null
    ? getRankIconUrl(listing.competitiveTier - 3) : listing.minRankIconUrl;
  const posted = listing.createdAt ? new Date(listing.createdAt).toLocaleDateString() : '';
  return (
    <article className={`lfg-card lfg-panel ${selected ? 'selected' : ''}`}>
      <div className="lfg-card-art">
        {artwork && <img src={artwork} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} />}
        {agent && <img className="lfg-agent-art" src={getAgentPortraitUrl(agent)} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} />}
        <span className="lfg-card-kind">{team ? 'TEAM · RECRUITING' : 'PLAYER · LOOKING FOR TEAM'}</span>
        {!isOwn && !preview && <button type="button" className="lfg-save" aria-label={`${listing.isSaved ? 'Unsave' : 'Save'} ${name}`} aria-pressed={!!listing.isSaved} disabled={savePending} onClick={onSave}><Bookmark size={17} fill={listing.isSaved ? 'currentColor' : 'none'} /></button>}
      </div>
      <div className="lfg-card-body">
        <div className="lfg-identity"><LfgAvatar listing={listing} name={name} /><div><h2 className="lfg-name">{name}</h2><p className="lfg-sub">{team ? listing.teamTag || 'Team listing' : listing.riotGameName ? `${listing.riotGameName}#${listing.riotTagLine ?? ''}` : 'Player listing'}</p></div></div>
        <div className="lfg-stats"><div><small>{team ? 'Rank wanted' : 'Rank'}</small><strong className="lfg-rank">{rankIcon && <img src={rankIcon} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} />}{rank}</strong></div><div><small>{team ? 'Role needed' : 'K/D'}</small><strong>{team ? role[0] || 'Flexible' : listing.kdRatio != null ? Number(listing.kdRatio).toFixed(2) : '—'}</strong></div><div><small>{team ? 'Roster' : 'Win rate'}</small><strong>{team ? listing.teamMemberCount ?? '—' : listing.winRate != null ? `${Math.round(Number(listing.winRate))}%` : '—'}</strong></div></div>
        <p className="lfg-description line-clamp-2">{listing.description || 'No description provided.'}</p>
        <div className="lfg-chips">{role.slice(0, 2).map(item => <span className="lfg-chip" key={item}>{item}</span>)}{listing.regionDisplayName && <span className="lfg-chip">{listing.regionDisplayName}</span>}</div>
        {agentNames.length > 0 && <p className="lfg-card-meta"><span>Agents</span> {agentNames.join(' / ')}</p>}
        {languages.length > 0 && <p className="lfg-card-meta"><span>Languages</span> {languages.join(' / ')}</p>}
        {!!listing.preferredServers?.length && <p className="lfg-card-meta"><span>Servers</span> {listing.preferredServers.join(' / ')}</p>}
        {!preview && <div className="lfg-card-bottom"><small>{listing.viewerInterestStatus ? `Request: ${listing.viewerInterestStatus}` : posted ? `Posted ${posted}` : ''}</small><button className="lfg-button" type="button" onClick={onSelect}>View {team ? 'team' : 'player'} <ArrowRight size={15} /></button></div>}
      </div>
    </article>
  );
}
