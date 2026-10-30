import { useState } from 'react';
import { useLfgRoster } from '@/hooks/competitive/useLfg';
import { resolveLfgAvatar } from '@/lib/lfgAvatar';
import { getRankIconUrl } from '@/lib/valorantRanks';
import type { LfgListing, LfgRosterMember } from '@/types/competitive';

function MemberAvatar({ member }: { member: LfgRosterMember }) {
  const [failed, setFailed] = useState(false);
  const source = resolveLfgAvatar(member.avatarUrl, member.avatarSeed, member.avatarStyle);
  return <span className="lfg-roster-avatar">{source && !failed ? <img src={source} alt="" onError={() => setFailed(true)} /> : (member.username || '?').slice(0, 2).toUpperCase()}</span>;
}

export function LfgRoster({ listing, compact = false, viewerScope }: { listing: LfgListing; compact?: boolean; viewerScope?: string }) {
  const roster = useLfgRoster(listing.id, !!listing.teamId, viewerScope);
  if (listing.id === 'preview') return null;
  if (roster.isLoading) return <p className="lfg-roster-message" role="status">Loading roster…</p>;
  if (roster.isError) return <p className="lfg-roster-message">Roster unavailable. <button type="button" onClick={() => void roster.refetch()}>Retry</button></p>;
  if (roster.data?.status === 'missing') return <p className="lfg-roster-message">No roster for this game.</p>;
  if (roster.data?.status === 'ambiguous') return <p className="lfg-roster-message">Roster unavailable. Team must resolve duplicate game rosters.</p>;
  const members = roster.data?.members ?? [];
  if (!members.length) return <p className="lfg-roster-message">No players in this roster yet.</p>;
  if (compact) return <div className="lfg-roster-preview" aria-label="Team roster"><span className="lfg-roster-label">Roster</span><div>{members.slice(0, 5).map(member => <span className="lfg-roster-preview-member" key={member.userId} title={member.username ?? 'Player'}><MemberAvatar member={member} /><span>{member.username || 'Player'}</span></span>)}{members.length > 5 && <span className="lfg-sub">+{members.length - 5}</span>}</div></div>;
  return <div className="lfg-roster-list">{members.map(member => <div className="lfg-roster-row" key={member.userId}><MemberAvatar member={member} /><div><strong>{member.username || 'Player'}</strong><p className="lfg-sub">{member.rosterRole || (member.isStarter ? 'Starter' : 'Member')}</p></div><div className="lfg-roster-stats">{listing.gameSlug === 'valorant' && member.competitiveTier != null && <img src={getRankIconUrl(member.competitiveTier - 3)} alt="" onError={event => { event.currentTarget.style.display = 'none'; }} />}<span>{member.competitiveTierName || 'Rank unavailable'}<br />{member.kdRatio != null ? `${Number(member.kdRatio).toFixed(2)} K/D` : 'K/D unavailable'} · {member.winRate != null ? `${Math.round(Number(member.winRate))}% WR` : 'WR unavailable'}</span></div></div>)}</div>;
}
