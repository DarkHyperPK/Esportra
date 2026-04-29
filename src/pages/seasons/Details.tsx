import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Footer from '@/components/Footer';
import SeasonQualificationsPanel from '@/components/season/SeasonQualificationsPanel';
import SeasonStandingsTable from '@/components/season/SeasonStandingsTable';
import SeasonTreePreview from '@/components/season/SeasonTreePreview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSeason, useSeasonQualifications, useSeasonStandings, useRespondSeasonQualification } from '@/hooks/useSeason';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import { ExternalLink, Trophy, Users, Workflow } from 'lucide-react';

const PUBLIC_TABS = [
  ['overview', 'Overview'],
  ['standings', 'Standings'],
  ['qualifications', 'Qualifications'],
] as const;

const SeasonsDetails = () => {
  const { id: seasonId } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data, isLoading, error, refetch } = useSeason(seasonId);
  const standingsQuery = useSeasonStandings(seasonId);
  const qualificationsQuery = useSeasonQualifications(seasonId);
  const respondQualification = useRespondSeasonQualification(seasonId ?? '');

  const [activeTab, setActiveTab] = useState<(typeof PUBLIC_TABS)[number][0]>('overview');
  const [busyRecordId, setBusyRecordId] = useState<string | null>(null);

  const myTeamsQuery = useQuery({
    queryKey: ['season', seasonId, 'my-teams'],
    queryFn: () => apiClient.get<Array<{ id: string }>>('/api/teams/me'),
    enabled: !!seasonId,
    retry: false,
  });

  const myEntityIds = useMemo(() => new Set((myTeamsQuery.data ?? []).map((team) => team.id)), [myTeamsQuery.data]);
  const myQualifications = useMemo(
    () => (qualificationsQuery.data ?? []).filter((record) => record.entityId && myEntityIds.has(record.entityId)),
    [myEntityIds, qualificationsQuery.data],
  );

  const handleRespond = async (recordId: string, status: 'accepted' | 'declined', notes?: string) => {
    if (!seasonId) return;
    setBusyRecordId(recordId);

    try {
      await respondQualification.mutateAsync({ recordId, status, notes });
      toast({
        title: status === 'accepted' ? 'Qualification accepted' : 'Qualification declined',
        description: 'Your qualification response has been saved.',
      });
    } catch (responseError) {
      toast({
        title: 'Qualification response failed',
        description: responseError instanceof Error ? responseError.message : 'Could not update your response.',
        variant: 'destructive',
      });
    } finally {
      setBusyRecordId(null);
    }
  };

  if (!seasonId) {
    return <div className="min-h-screen bg-[#050505]" />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-10 text-center text-zinc-400">
            Loading season...
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8">
            <p className="font-semibold text-red-100">Could not load this season.</p>
            <p className="mt-2 text-sm text-red-200/80">{error instanceof Error ? error.message : 'Season not found.'}</p>
            <Button onClick={() => refetch()} className="mt-4 bg-white/10 text-white hover:bg-white/20">
              Retry
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[36px] border border-white/10 bg-black/30 p-6 backdrop-blur-2xl sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-400">Season page</p>
                <Badge className="bg-rose-500/10 text-rose-300 hover:bg-rose-500/10">{data.season.status}</Badge>
                <Badge className="bg-white/10 text-white hover:bg-white/10">{data.season.participantMode}</Badge>
              </div>
              <h1 className="mt-3 text-4xl font-black tracking-tight">{data.season.name}</h1>
              <p className="mt-3 max-w-3xl text-sm text-zinc-400">
                {data.season.description || 'This season does not have a public description yet.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {data.permissions.canManage && (
                <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                  <Link to={`/organizer/seasons/${seasonId}`}>
                    Manage season
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Game</p>
              <p className="mt-2 font-semibold text-white">{data.season.game}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Nodes</p>
              <p className="mt-2 font-semibold text-white">{data.nodes.length}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Starts</p>
              <p className="mt-2 font-semibold text-white">{data.season.startDate || 'TBA'}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Ends</p>
              <p className="mt-2 font-semibold text-white">{data.season.endDate || 'TBA'}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {PUBLIC_TABS.map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={
                activeTab === tab
                  ? 'rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-white'
                  : 'rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-400 transition hover:bg-white/10 hover:text-white'
              }
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[32px] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
              <div className="mb-5 flex items-center gap-3">
                <Workflow className="h-5 w-5 text-rose-300" />
                <h2 className="text-2xl font-semibold">Season tree</h2>
              </div>
              <SeasonTreePreview tree={data.tree} />
            </div>

            <div className="space-y-6">
              <div className="rounded-[32px] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
                <div className="mb-4 flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-amber-300" />
                  <h2 className="text-xl font-semibold">Standings snapshot</h2>
                </div>
                <SeasonStandingsTable standings={(standingsQuery.data ?? []).slice(0, 5)} />
              </div>

              <div className="rounded-[32px] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
                <div className="mb-4 flex items-center gap-3">
                  <Users className="h-5 w-5 text-emerald-300" />
                  <h2 className="text-xl font-semibold">My qualification actions</h2>
                </div>
                {myQualifications.length > 0 ? (
                  <SeasonQualificationsPanel
                    qualifications={myQualifications}
                    canRespond
                    pendingRecordId={busyRecordId}
                    onRespond={handleRespond}
                  />
                ) : (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-400">
                    Sign in with the team account that registered into this season to see response controls for earned or invited spots.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'standings' && (
          <div className="mt-6 rounded-[32px] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
            <SeasonStandingsTable standings={standingsQuery.data ?? []} />
          </div>
        )}

        {activeTab === 'qualifications' && (
          <div className="mt-6 rounded-[32px] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
            <SeasonQualificationsPanel qualifications={qualificationsQuery.data ?? []} />
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default SeasonsDetails;

