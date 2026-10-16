import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CommandButton } from '@/components/management/CommandSurface';
import type { TournamentBroadcastWorkspace } from '@/hooks/useTournamentBroadcast';

export function TournamentBroadcastShows({ shows }: { shows: TournamentBroadcastWorkspace['shows'] }) {
  return <section aria-label="Tournament broadcasts">
    <div className="broadcast-section-heading"><h2>Continue your broadcast</h2><span>{shows.length} saved</span></div>
    {shows.length === 0 && <p className="text-zinc-400">No broadcasts yet. Prepare your first one below.</p>}
    {shows.map(show => {
      const history = ['ended','cancelled','live'].includes(show.status);
      return <div className="broadcast-saved-show" key={show.id}><div><span className="broadcast-caption">{show.status === 'live' ? 'Marked live' : show.status}</span><h3>{show.title}</h3><p>{show.matchCount} assigned {show.matchCount === 1 ? 'match' : 'matches'}{show.scheduledAt ? ` · ${new Date(show.scheduledAt).toLocaleString()}` : ''}{show.lastSyncedAt ? ' · Setup previously published' : ''}</p></div><div className="broadcast-saved-show-actions">
        <CommandButton asChild><Link to={`/broadcast/shows/${show.id}/${history ? 'activity' : 'setup'}`}>{history ? 'View activity' : 'Continue setup'}<ArrowRight size={14} /></Link></CommandButton>
        <CommandButton asChild variant="ghost"><Link to={`/broadcast/shows/${show.id}`}>Advanced plan</Link></CommandButton>
      </div></div>;
    })}
  </section>;
}
