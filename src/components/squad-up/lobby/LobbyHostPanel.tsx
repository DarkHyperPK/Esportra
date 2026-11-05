import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { CommandButton } from '@/components/management/CommandSurface';
import { resolveLfgAvatar } from '@/lib/lfgAvatar';
import { LobbyRail } from '../shared/LobbyRail';
import { lobbyRail, roleLabel } from './lobbySlots';
import type { Lobby, LobbyMember } from '@/schemas/squadUpLobby';

interface LobbyHostPanelProps {
  lobby: Lobby;
  members: LobbyMember[];
  myId?: string | null;
  busy: boolean;
  onAccept: (userId: string) => void;
  onDecline: (userId: string) => void;
  onKick: (userId: string) => void;
  onClose: () => void;
}

/** Your lobby: the rail filling up, requests to accept or decline, and the group chat once someone joins. */
export function LobbyHostPanel({ lobby, members, myId, busy, onAccept, onDecline, onKick, onClose }: LobbyHostPanelProps) {
  const { slots, wanted } = lobbyRail(lobby, myId);
  const requests = members.filter((member) => member.status === 'requested');
  const accepted = members.filter((member) => member.status === 'accepted');
  const full = lobby.status === 'full';
  return (
    <section className="su-host" aria-label="Your lobby">
      <header className="su-row">
        <div>
          <h3>{lobby.title || 'Your lobby'}</h3>
          <p className="su-hint">{full ? 'Full. Share the party code in the chat.' : `${lobby.openSlots - lobby.acceptedCount} of ${lobby.openSlots} slots open. Keep this page open so players can find you.`}</p>
        </div>
        {lobby.conversationId && (
          <CommandButton asChild variant={full ? 'primary' : 'secondary'} size="sm"><Link to={`/inbox/${lobby.conversationId}`}><MessageSquare size={14} aria-hidden /> Group chat</Link></CommandButton>
        )}
      </header>
      <LobbyRail slots={slots} wanted={wanted} label="Your lobby" />
      <h4>Requests {requests.length > 0 && <span className="su-count">{requests.length}</span>}</h4>
      {requests.length === 0 ? <p className="su-hint">No requests yet. They appear here the moment someone asks.</p> : (
        <ul className="su-people">
          {requests.map((member) => (
            <li key={member.userId}>
              <img src={resolveLfgAvatar(member.avatarUrl, member.avatarSeed, member.avatarStyle) ?? ''} alt="" />
              <span><strong>{member.username ?? 'Player'}</strong><span className="su-hint">{[member.competitiveTierName ?? 'Unranked', roleLabel(member.roleKey)].filter(Boolean).join(' · ')}</span></span>
              <CommandButton variant="ghost" size="sm" disabled={busy} onClick={() => onDecline(member.userId)}>Decline</CommandButton>
              <CommandButton variant="primary" size="sm" disabled={busy || full} onClick={() => onAccept(member.userId)}>Accept</CommandButton>
            </li>
          ))}
        </ul>
      )}
      {accepted.length > 0 && (
        <>
          <h4>In your lobby</h4>
          <ul className="su-people">
            {accepted.map((member) => (
              <li key={member.userId}>
                <img src={resolveLfgAvatar(member.avatarUrl, member.avatarSeed, member.avatarStyle) ?? ''} alt="" />
                <span><strong>{member.username ?? 'Player'}</strong><span className="su-hint">{member.riotGameName ? `${member.riotGameName}#${member.riotTagLine ?? ''}` : roleLabel(member.roleKey)}</span></span>
                <CommandButton variant="ghost" size="sm" disabled={busy} onClick={() => onKick(member.userId)}>Remove</CommandButton>
              </li>
            ))}
          </ul>
        </>
      )}
      <CommandButton variant="ghost" size="md" disabled={busy} onClick={onClose}>Close lobby</CommandButton>
    </section>
  );
}
