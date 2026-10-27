import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLfgReducedMotion } from '@/hooks/competitive/useLfgReducedMotion';
import { LFG_LANGUAGES } from '@/lib/lfgLanguages';
import { LfgAvatar } from './LfgAvatar';
import { useExpressInterest, useWithdrawInterest } from '@/hooks/competitive/useLfg';
import type { CatalogGameRole, LfgListing } from '@/types/competitive';

export function LfgListingDetail({ listing, roles, currentUserId, showOwnerLink = true }: { listing: LfgListing; roles: CatalogGameRole[]; currentUserId?: string; showOwnerLink?: boolean }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const reduced = useLfgReducedMotion();
  const express = useExpressInterest(listing.id);
  const withdraw = useWithdrawInterest(listing.id);
  const team = listing.intent !== 'looking_for_team';
  const name = (team ? listing.teamName : listing.username) || 'Player';
  const own = currentUserId === listing.userId;
  const expired = !!listing.expiresAt && new Date(listing.expiresAt).getTime() <= Date.now() && !['removed','closed'].includes(listing.status);
  const roleNames = (listing.preferredRoles ?? []).map(key => roles.find(role => role.roleKey === key)?.displayName ?? key);
  async function send() {
    setError('');
    try { await express.mutateAsync({ message: message.trim() || null }); setMessage(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send request. Try again.'); }
  }
  async function cancel() {
    setError('');
    try { await withdraw.mutateAsync(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not withdraw request. Try again.'); }
  }
  return (
    <motion.div className="lfg-detail-body" initial={reduced || document.documentElement.dataset.lfgInput === 'keyboard' ? false : { opacity: 0, transform: 'translateY(6px)' }} animate={{ opacity: 1, transform: 'translateY(0)' }} transition={{ duration: .18, ease: [0.2, 0, 0, 1] }}>
      <div className="lfg-eyebrow">{team ? 'Team spotlight' : 'Player spotlight'}</div>
      <div className="lfg-identity"><LfgAvatar listing={listing} name={name} /><div><h2>{name}</h2><p className="lfg-sub">{listing.gameSlug} · {listing.modeKey || 'Any mode'}</p></div></div>
      {own && <p className="lfg-status">Listing status: {expired ? 'Expired' : listing.status}</p>}
      <div className="lfg-stats"><div><small>Rank</small><strong>{listing.competitiveTierName || listing.minRankDisplayName || 'Any rank'}</strong></div><div><small>Region</small><strong>{listing.regionDisplayName || listing.regionKey || 'Any'}</strong></div><div><small>Role</small><strong>{roleNames[0] || 'Flexible'}</strong></div></div>
      <h3>What {team ? 'we are' : 'I am'} looking for</h3><p className="lfg-description">{listing.description || 'No description provided.'}</p>
      {roleNames.length > 1 && <><h3>Roles</h3><p className="lfg-description">{roleNames.join(', ')}</p></>}
      {!!listing.preferredServers?.length && <><h3>Servers</h3><p className="lfg-description">{listing.preferredServers.join(', ')}</p></>}
      {!!listing.languages?.length && <><h3>Languages</h3><p className="lfg-description">{listing.languages.map(code => LFG_LANGUAGES.find(item => item.code === code)?.label ?? code).join(', ')}</p></>}
      {own ? showOwnerLink && <Link className="lfg-button lfg-button-primary" to={`/competitive/lfg/${listing.id}`}>Manage listing</Link> : listing.viewerInterestStatus ? <>
        <p className="lfg-status">Request: {listing.viewerInterestStatus}</p>
        {listing.viewerInterestStatus === 'expressed' && <button className="lfg-button" disabled={withdraw.isPending} type="button" onClick={() => void cancel()}>Withdraw request</button>}
        {listing.viewerInterestStatus === 'accepted' && listing.viewerConversationId && <Link className="lfg-button lfg-button-primary" to={`/inbox/${listing.viewerConversationId}`}>Open conversation</Link>}
        {listing.viewerInterestStatus === 'accepted' && !listing.viewerConversationId && <Link className="lfg-button" to="/inbox">Open Inbox</Link>}
      </> : <>
        <h3>Your introduction</h3><textarea className="lfg-input" maxLength={500} value={message} onChange={event => setMessage(event.target.value)} aria-label="Introduction" placeholder="Tell them what you are looking for…" />
        <button className="lfg-button lfg-button-primary" disabled={express.isPending} type="button" onClick={() => void send()}>{express.isPending ? 'Sending…' : team ? 'Request to join' : 'Invite to connect'}</button>
        <p className="lfg-sub" style={{ marginTop: 9 }}>A conversation opens after acceptance. Team membership is separate.</p>
      </>}
      {error && <p className="lfg-error" role="alert">{error}</p>}
    </motion.div>
  );
}
