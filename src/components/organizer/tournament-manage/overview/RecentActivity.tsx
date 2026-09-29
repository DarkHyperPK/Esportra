import { cn } from '@/lib/utils';
import type { DashboardParticipant } from '@/hooks/useTournamentDashboard';
import { EYEBROW_CLASS, PANEL_CLASS } from '@/components/ui/kit/tone';

interface RecentActivityProps {
  participants: DashboardParticipant[];
}

const INACTIVE = new Set(['withdrawn', 'rejected', 'cancelled', 'disqualified']);
const shortDate = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const displayName = (p: DashboardParticipant) => p.team_name ?? p.gamer_tag ?? p.user?.username ?? 'Unknown';

/** Latest registrations and check-ins, newest first. Hidden until there is something to show. */
export function RecentActivity({ participants }: RecentActivityProps) {
  const active = participants.filter((p) => !INACTIVE.has(p.status));
  const registered = [...active]
    .sort((a, b) => new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime())
    .slice(0, 5);
  const checkedIn = active
    .filter((p): p is DashboardParticipant & { checked_in_at: string } => Boolean(p.checked_in_at))
    .sort((a, b) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime())
    .slice(0, 5);

  if (registered.length === 0) return null;

  const columns = [
    { key: 'registered', title: 'Latest registrations', rows: registered.map((p) => ({ id: p.id, name: displayName(p), meta: shortDate(p.registered_at) })) },
    { key: 'checked-in', title: 'Latest check-ins', rows: checkedIn.map((p) => ({ id: p.id, name: displayName(p), meta: shortDate(p.checked_in_at) })) },
  ].filter((column) => column.rows.length > 0);

  return (
    <section aria-label="Recent activity" className={cn(PANEL_CLASS, 'grid sm:grid-cols-2 sm:divide-x sm:divide-white/[0.06]')}>
      {columns.map((column) => (
        <div key={column.key} className="px-5 py-4">
          <p className={cn(EYEBROW_CLASS, 'mb-3')}>{column.title}</p>
          <ul className="space-y-2.5">
            {column.rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-zinc-200">{row.name}</span>
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-zinc-500">{row.meta}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
