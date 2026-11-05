import { Link } from 'react-router-dom';
import type { QueueMatch } from '@/schemas/lfgQueue';

export function QueueMatches({ matches }: { matches: QueueMatch[] }) {
  return (
    <aside className="lfg-panel queue-matches" aria-label="Recent matches">
      <h3>Matches (24h)</h3>
      {matches.length === 0
        ? <p className="queue-muted">No matches yet. Keep swiping.</p>
        : matches.map((match) => (
          <div className="queue-match-row" key={match.matchId}>
            <span>
              {match.matchedUsername}
              {match.riotGameName && <span className="queue-muted"> · {match.riotGameName}#{match.riotTagLine ?? ''}</span>}
            </span>
            {match.conversationId && <Link className="lfg-button" to={`/inbox/${match.conversationId}`}>Chat</Link>}
          </div>
        ))}
    </aside>
  );
}
