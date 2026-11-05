import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CommandButton } from '@/components/management/CommandSurface';
import {
  useAcceptLobbyRequest, useCloseLobby, useCreateLobby, useDeclineLobbyRequest, useKickFromLobby, useLeaveLobby,
  useLobbyBoard, useMyLobbies, useRequestLobbySlot,
} from '@/hooks/competitive/useSquadUpLobbies';
import { squadUpLobbyErrorMessage } from '@/lib/squadUpErrors';
import type { SquadUpFilters } from '@/schemas/squadUp';
import { LobbyCard } from './LobbyCard';
import { LobbyHostPanel } from './LobbyHostPanel';
import { CreateLobbyForm } from './CreateLobbyForm';
import './lobby.css';

/** Lobby mode: your own lobby if you host one, the lobbies you asked to join, and the board of open lobbies. */
export function LobbyPanel({ filters, myId }: { filters: SquadUpFilters; myId?: string | null }) {
  const mine = useMyLobbies(true);
  const hosting = mine.data?.hosting ?? null;
  const board = useLobbyBoard(filters, !hosting);
  const create = useCreateLobby();
  const request = useRequestLobbySlot();
  const accept = useAcceptLobbyRequest();
  const decline = useDeclineLobbyRequest();
  const kick = useKickFromLobby();
  const close = useCloseLobby();
  const leave = useLeaveLobby();
  const [creating, setCreating] = useState(false);
  const failed = [request, accept, decline, kick, close, leave].find((action) => action.isError);
  const busy = [request, accept, decline, kick, close, leave].some((action) => action.isPending);

  if (hosting) {
    return (
      <div className="su-lobbies">
        {failed && <p className="su-error" role="alert">{squadUpLobbyErrorMessage(failed.error)}</p>}
        <LobbyHostPanel lobby={hosting} members={mine.data?.members ?? []} myId={myId} busy={busy}
          onAccept={(userId) => accept.mutate({ lobbyId: hosting.id, userId })}
          onDecline={(userId) => decline.mutate({ lobbyId: hosting.id, userId })}
          onKick={(userId) => kick.mutate({ lobbyId: hosting.id, userId })}
          onClose={() => close.mutate(hosting.id)} />
      </div>
    );
  }

  const joined = mine.data?.joined ?? [];
  const lobbies = board.data ?? [];
  return (
    <div className="su-lobbies">
      {failed && <p className="su-error" role="alert">{squadUpLobbyErrorMessage(failed.error)}</p>}
      {joined.map((lobby) => (
        <div key={lobby.id} className="su-joined">
          <p><strong>{lobby.title || `${lobby.hostUsername ?? 'A player'}'s lobby`}</strong>
            <span className="su-hint"> {lobby.myStatus === 'accepted' ? (lobby.status === 'full' ? 'Full, time to queue' : 'You\'re in') : 'Waiting for the host'}</span></p>
          <div className="su-row">
            {lobby.conversationId && <CommandButton asChild variant="primary" size="sm"><Link to={`/inbox/${lobby.conversationId}`}>Group chat</Link></CommandButton>}
            <CommandButton variant="ghost" size="sm" disabled={busy} onClick={() => leave.mutate(lobby.id)}>{lobby.myStatus === 'accepted' ? 'Leave' : 'Cancel request'}</CommandButton>
          </div>
        </div>
      ))}
      {creating ? (
        <CreateLobbyForm pending={create.isPending} error={create.isError ? squadUpLobbyErrorMessage(create.error) : undefined}
          onCancel={() => setCreating(false)}
          onCreate={(input) => create.mutate({ input, filters }, { onSuccess: () => setCreating(false) })} />
      ) : (
        <div className="su-lobbies-head">
          <p className="su-hint">{lobbies.length > 0 ? `${lobbies.length} open ${lobbies.length === 1 ? 'lobby fits' : 'lobbies fit'} your filters.` : ''}</p>
          <CommandButton variant="secondary" size="md" onClick={() => setCreating(true)}>Open a lobby</CommandButton>
        </div>
      )}
      {board.isLoading ? <p className="su-hint" role="status">Finding lobbies…</p>
        : board.isError ? <p className="su-error" role="alert">{squadUpLobbyErrorMessage(board.error)}</p>
        : lobbies.length === 0 ? (
          <div className="su-empty"><p><strong>No open lobbies match right now.</strong></p><p>Open your own: players who fit your filters will see it straight away.</p></div>
        ) : (
          <div className="su-lobby-grid">
            {lobbies.map((lobby) => (
              <LobbyCard key={lobby.id} lobby={lobby} myId={myId} busy={busy} onRequest={(item, roleKey) => request.mutate({ lobbyId: item.id, roleKey })} />
            ))}
          </div>
        )}
    </div>
  );
}
