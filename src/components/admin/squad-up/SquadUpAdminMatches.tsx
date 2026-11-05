import { formatDistanceToNow } from 'date-fns';
import type { AdminMatch } from '@/schemas/squadUpAdmin';

export function SquadUpAdminMatches({ matches }: { matches: AdminMatch[] }) {
  return (
    <section aria-label="Recent matches" className="rounded-xl border border-white/[0.08] p-4">
      <h2 className="mb-3 text-sm font-semibold text-white">Recent matches</h2>
      {matches.length === 0 ? <p className="text-sm text-zinc-400">No matches yet.</p> : (
        <ul className="space-y-1.5 text-sm">{matches.map((match) => (
          <li key={match.id} className="flex justify-between gap-3 border-t border-white/[0.06] pt-1.5 first:border-0 first:pt-0">
            <span>{match.user1Username ?? match.user1Id.slice(0, 8)} + {match.user2Username ?? match.user2Id.slice(0, 8)}</span>
            <span className="text-zinc-400">{formatDistanceToNow(new Date(match.matchedAt), { addSuffix: true })}</span>
          </li>
        ))}</ul>
      )}
    </section>
  );
}
