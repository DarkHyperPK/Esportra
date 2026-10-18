import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { StatusPill } from '@/components/ui/kit';
import { ShieldAlert } from 'lucide-react';

interface Ban {
  id: string;
  tournament_id: string;
  tournament_name: string;
  tournament_slug: string;
  ban_reason: string;
  banned_at: string;
  is_active: boolean;
}

export default function MyBans() {
  const { data: userBans = [], isLoading: loadingUser } = useQuery({
    queryKey: ['my-bans'],
    queryFn: () => apiClient.get<Ban[]>('/api/tournaments/my-bans'),
  });

  const { data: teamBans = [], isLoading: loadingTeam } = useQuery({
    queryKey: ['team-bans'],
    queryFn: () => apiClient.get<Ban[]>('/api/tournaments/team-bans'),
  });

  const loading = loadingUser || loadingTeam;
  const allBans = [...(Array.isArray(userBans) ? userBans : []), ...(Array.isArray(teamBans) ? teamBans : [])];
  const activeBans = allBans.filter((b) => b.is_active);
  const pastBans = allBans.filter((b) => !b.is_active);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3 mb-8">
        <ShieldAlert className="h-6 w-6 text-red-400" />
        <h1 className="font-heading text-2xl font-bold text-white">My Bans</h1>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : allBans.length === 0 ? (
        <div className="border border-white/[0.06] px-6 py-10 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-400">You have no bans on record. Good standing.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {activeBans.length > 0 && (
            <section>
              <h2 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-red-400">
                Active Bans ({activeBans.length})
              </h2>
              <div className="space-y-3">
                {activeBans.map((ban) => (
                  <BanCard key={ban.id} ban={ban} />
                ))}
              </div>
            </section>
          )}

          {pastBans.length > 0 && (
            <section>
              <h2 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                Past Bans ({pastBans.length})
              </h2>
              <div className="space-y-3">
                {pastBans.map((ban) => (
                  <BanCard key={ban.id} ban={ban} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function BanCard({ ban }: { ban: Ban }) {
  return (
    <div className="border border-white/[0.06] bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            to={`/tournaments/${ban.tournament_slug}`}
            className="font-heading text-sm font-bold text-white hover:underline"
          >
            {ban.tournament_name || 'Unknown tournament'}
          </Link>
          <p className="mt-1 text-xs text-zinc-400">{ban.ban_reason || 'No reason provided'}</p>
          <p className="mt-1 text-xs text-zinc-600">
            Banned {new Date(ban.banned_at).toLocaleDateString()}
          </p>
        </div>
        <StatusPill label={ban.is_active ? 'Active' : 'Lifted'} tone={ban.is_active ? 'critical' : 'neutral'} />
      </div>
      {ban.is_active && (
        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <Link
            to={`/user/raise-dispute?tournament=${ban.tournament_id}&type=ban_appeal`}
            className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
          >
            File a ban appeal →
          </Link>
        </div>
      )}
    </div>
  );
}
