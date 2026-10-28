import { Bookmark, ChevronRight } from 'lucide-react';
import { useLfgBanner } from '@/hooks/competitive/useLfgBanner';
import { LfgRole } from './LfgRole';
import { LfgMetrics } from './LfgMetrics';
import type { CatalogGameRole, LfgListing } from '@/types/competitive';
import { parsePopularAgents, resolveAgent } from '@/lib/valorantAgents';
import { LfgCurrentRank } from './LfgCurrentRank';
import { useValorantAgents } from '@/hooks/useValorantCatalog';
import { LFG_LANGUAGES } from '@/lib/lfgLanguages';
import { LfgAvatar } from './LfgAvatar';
import { LfgRoster } from './LfgRoster';
import { LfgRankRange } from './LfgRankRange';

export function LfgListingCard({ listing, roles, selected, onSelect, onSave, savePending, isOwn, preview = false }: {
  listing: LfgListing; roles: CatalogGameRole[]; artwork?: string | null; selected: boolean;
  onSelect: () => void; onSave: () => void; savePending: boolean; isOwn: boolean; preview?: boolean;
}) {
  const team = listing.intent !== 'looking_for_team';
  const name = (team ? listing.teamName : listing.username) || (team ? 'Team' : 'Player');
  const valorant = listing.gameSlug === 'valorant';
  const catalog = useValorantAgents(valorant);
  const played = valorant ? parsePopularAgents(listing.popularAgents) : [];
  const preferred = listing.preferredAgents ?? [];
  const agentIds = valorant && !team ? (preferred.length ? preferred : played.map(agent => agent.agentId)).filter(Boolean).slice(0, 5) : [];
  const { source: banner, onError: bannerError } = useLfgBanner(listing);
  const languages = (listing.languages ?? []).map(code => LFG_LANGUAGES.find(item => item.code === code)?.label ?? code);
  return <article className={`lfg-card lfg-panel lfg-compact-card ${selected ? 'selected' : ''}`}>
    <div className={`lfg-compact-hero ${banner ? 'has-art' : 'no-art'}`}>
      {banner && <img className="lfg-compact-banner" src={banner} alt="" loading="lazy" onError={bannerError} />}
      <div className="lfg-compact-top"><div className="lfg-identity"><LfgAvatar listing={listing} name={name} /><div className="lfg-compact-name"><h2 className="lfg-name">{name}</h2><p className="lfg-sub">{team ? listing.teamTag || 'Team' : listing.riotGameName ? `${listing.riotGameName}#${listing.riotTagLine ?? ''}` : 'Player'}</p></div></div>
      {!isOwn && !preview && <button type="button" className="lfg-compact-save" title={listing.isSaved ? 'Remove from saved listings' : 'Save listing'} aria-label={`${listing.isSaved ? 'Unsave' : 'Save'} ${name}`} aria-pressed={!!listing.isSaved} disabled={savePending} onClick={onSave}><Bookmark size={17} fill={listing.isSaved ? 'currentColor' : 'none'} /></button>}</div>
    </div>
    <div className="lfg-compact-content">
      <div className="lfg-compact-summary">{team ? <LfgRankRange listing={listing} /> : <LfgCurrentRank game={listing.gameSlug} rank={listing} />}</div>
      {!!listing.preferredRoles?.length && <div className="lfg-card-roles">{listing.preferredRoles.map(key => <LfgRole key={key} game={listing.gameSlug} roleKey={key} roles={roles} />)}</div>}
      {!team && <LfgMetrics listing={listing} />}
      {team && <LfgRoster listing={listing} compact />}
      {agentIds.length > 0 && <div className="lfg-compact-agent-section"><span className="lfg-compact-agent-label">Agents · WR / K/D</span><div className="lfg-compact-agents" aria-label="Preferred agents">{agentIds.map(id => { const data = played.find(item => item.agentId.toLowerCase() === id.toLowerCase()); const asset = catalog.data?.[id.toLowerCase()]; const fallback = resolveAgent(id); const agentName = asset?.displayName || fallback?.displayName || data?.displayName || 'Agent'; const icon = asset?.displayIcon || fallback?.iconUrl || data?.iconUrl; return <div key={id} role="img" className="lfg-compact-agent" title={`${agentName}: ${data?.gamesPlayed ? `${data.gamesPlayed} games` : listing.statsSyncStatus === 'complete' ? 'No recorded matches' : 'Stats unavailable'}`} aria-label={`${agentName}: ${data?.gamesPlayed ? `${Math.round(data.wins / data.gamesPlayed * 100)}% win rate, ${data.kdRatio != null ? Number(data.kdRatio).toFixed(2) : 'unavailable'} K/D` : listing.statsSyncStatus === 'complete' ? 'No recorded matches' : 'Stats unavailable'}`}>{icon ? <img src={icon} alt="" loading="lazy" /> : <span>{agentName.slice(0, 2)}</span>}<small>{data?.gamesPlayed ? `${Math.round(data.wins / data.gamesPlayed * 100)}%` : '—'}<br />{data?.kdRatio != null ? Number(data.kdRatio).toFixed(2) : '—'}</small></div>; })}</div></div>}
      <p className="lfg-description lfg-compact-description">{listing.description || 'No description provided.'}</p>
      <div className="lfg-compact-bottom"><span>{[listing.regionDisplayName || listing.regionKey, languages.join(' / ')].filter(Boolean).join(' · ') || 'Any region'}</span>{listing.viewerInterestStatus && <span>Request: {listing.viewerInterestStatus}</span>}{!preview && <button className="lfg-compact-expand" type="button" aria-haspopup="dialog" aria-expanded={selected} onClick={onSelect}>More details <ChevronRight size={15} /></button>}</div>
    </div>
  </article>;
}
