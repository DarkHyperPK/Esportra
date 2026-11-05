import { Link } from 'react-router-dom';
import type { SquadUpMatch } from '@/schemas/squadUp';

export function SquadUpMatches({ matches }: { matches: SquadUpMatch[] }) {
  return (
    <aside className="lfg-panel squad-matches" aria-label="Recent matches">
      <h3>Matches (24h)</h3>
      {matches.length === 0
        ? <p className="squad-muted">No matches yet. Keep swiping.</p>
        : matches.map((match) => (
          <div className="squad-match-row" key={match.matchId}>
            <span>
              {match.matchedUsername}
              {match.riotGameName && <span className="squad-muted"> · {match.riotGameName}#{match.riotTagLine ?? ''}</span>}
            </span>
            {match.conversationId && <Link className="lfg-button" to={`/inbox/${match.conversationId}`}>Chat</Link>}
          </div>
        ))}
    </aside>
  );
}
