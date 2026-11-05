import { useState } from 'react';
import { getCountryFlagUrl } from '@/utils/countries';
import { countryName } from '@/lib/countryAreas';
import { CommandButton } from '@/components/management/CommandSurface';
import { LobbyRail } from '../shared/LobbyRail';
import { lobbyRail, roleLabel } from './lobbySlots';
import type { Lobby } from '@/schemas/squadUpLobby';

interface LobbyCardProps {
  lobby: Lobby;
  myId?: string | null;
  busy: boolean;
  onRequest: (lobby: Lobby, roleKey: string | null) => void;
}

/** One open lobby on the board: who is in, what they still need, and a way to ask for a slot. */
export function LobbyCard({ lobby, myId, busy, onRequest }: LobbyCardProps) {
  const { slots, wanted } = lobbyRail(lobby, myId);
  const [role, setRole] = useState<string | null>(lobby.wantedRoles[0] ?? null);
  const open = lobby.openSlots - lobby.acceptedCount;
  return (
    <article className="su-lobby-card" aria-label={`${lobby.title || 'Lobby'} hosted by ${lobby.hostUsername ?? 'a player'}`}>
      <header>
        <h3>{lobby.title || `${lobby.hostUsername ?? 'A player'}'s lobby`}</h3>
        <p className="su-hint">
          {lobby.hostTierName ? `${lobby.hostTierName} host` : 'Unranked host'} · {lobby.mode === 'competitive' ? 'Competitive' : 'Unrated'} · {open} {open === 1 ? 'slot' : 'slots'} open
          {lobby.micRequired ? ' · Mic required' : ''}
        </p>
        <span className="su-flags">{lobby.wantedCountries.slice(0, 6).map((code) => (
          <img key={code} src={getCountryFlagUrl(code)} alt={countryName(code)} title={countryName(code)} loading="lazy" />
        ))}</span>
      </header>
      <LobbyRail slots={slots} wanted={wanted} label="Lobby" />
      {lobby.myStatus === 'requested' ? <p className="su-status" role="status">Request sent. The host will accept or decline.</p>
        : lobby.myStatus === 'accepted' ? <p className="su-status" role="status">You're in this lobby.</p>
        : (
          <div className="su-lobby-ask">
            {lobby.wantedRoles.length > 0 && (
              <div className="su-choice" role="radiogroup" aria-label="Role you will play">
                {lobby.wantedRoles.map((key) => (
                  <button key={key} type="button" role="radio" aria-checked={role === key} onClick={() => setRole(key)}>{roleLabel(key)}</button>
                ))}
              </div>
            )}
            <CommandButton variant="primary" size="md" slide disabled={busy} onClick={() => onRequest(lobby, role)}>Ask to join</CommandButton>
          </div>
        )}
    </article>
  );
}
