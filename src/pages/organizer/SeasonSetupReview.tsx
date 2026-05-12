import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Calendar, CheckCircle2, ChevronLeft, GitBranch, Link2, Target, Trophy, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSeason } from '@/hooks/useSeason';
import { buildSeasonTreeFromDrafts, hydrateSeasonBuilderNodes, readOutgoingConnections, readTournamentConfig, validateSeasonSetupDomain } from '@/components/season/builder/seasonBuilderUtils';
import SeasonTreePreview from '@/components/season/SeasonTreePreview';
import { cn } from '@/lib/utils';
import type { SeasonBuilderNode, SeasonRuleDraft } from '@/types/season';

const formatDate = (value?: string | null) => {
  if (!value) return 'Missing';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getReviewIssues = (nodes: SeasonBuilderNode[], rules: SeasonRuleDraft[]) => {
  const result = validateSeasonSetupDomain(nodes, rules);
  return { ...result, blockers: result.issues };
};

const SeasonSetupReview = () => {
  const { id: seasonId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useSeason(seasonId);

  const nodes = useMemo(() => (data ? hydrateSeasonBuilderNodes(data.nodes) : []), [data]);
  const rules = useMemo<SeasonRuleDraft[]>(() => data ? data.rules.map((rule) => ({
    id: rule.id,
    sourceNodeId: rule.sourceNodeId,
    sourceStageId: rule.sourceStageId,
    destinationNodeId: rule.destinationNodeId,
    placementFrom: rule.placementFrom,
    placementTo: rule.placementTo,
    pointsAwarded: rule.pointsAwarded,
    qualificationStatus: rule.qualificationStatus,
    autoCreateQualification: rule.autoCreateQualification,
    regionKey: rule.regionKey,
  })) : [], [data]);
  const review = useMemo(() => getReviewIssues(nodes, rules), [nodes, rules]);
  const treePreview = useMemo(() => (seasonId ? buildSeasonTreeFromDrafts(seasonId, nodes) : []), [nodes, seasonId]);

  if (!seasonId) return <div className="min-h-screen bg-[#050505]" />;

  if (isLoading) {
    return <div className="min-h-screen bg-[#050505] px-6 py-24 text-center text-zinc-500">Loading season review...</div>;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#050505] px-6 py-24 text-white">
        <div className="mx-auto max-w-2xl border border-red-500/20 bg-red-500/10 p-8">
          <p className="font-semibold text-red-100">Could not load this season.</p>
          <p className="mt-2 text-sm text-red-200/80">{error instanceof Error ? error.message : 'Season not found.'}</p>
          <Button onClick={() => refetch()} className="mt-5 rounded-none bg-white text-black hover:bg-zinc-200">Retry</Button>
        </div>
      </div>
    );
  }

  const readyForManagement = review.blockers.length === 0;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 border border-white/10 bg-[#08080a] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link to={`/season/setup/${seasonId}/plan`} className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500 hover:text-zinc-200">
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to plan
            </Link>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.4em] text-rose-400">Season setup · Review</p>
            <h1 className="mt-3 text-4xl font-black uppercase tracking-[-0.04em] text-white">{data.season.name}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">Review the tournament structure, schedules, scoring, and advancement flow before entering the management realm.</p>
          </div>
          <div className="grid grid-cols-4 border border-white/10 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            {['Shell', 'Plan', 'Review', 'Manage'].map((step) => (
              <div key={step} className={cn('px-4 py-3', step === 'Review' ? 'bg-rose-500 text-white' : 'bg-white/[0.03]')}>{step}</div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="border border-white/10 bg-[#08080a] p-6 lg:p-8">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-600">Structure tree</p>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">Tournament graph review</h2>
                </div>
                <span className={cn('inline-flex w-fit items-center gap-2 border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em]', readyForManagement ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/25 bg-amber-500/10 text-amber-300')}>
                  {readyForManagement ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {readyForManagement ? 'Ready' : 'Needs work'}
                </span>
              </div>
              <SeasonTreePreview tree={treePreview} className="mt-6" />
            </section>

            <section className="border border-white/10 bg-[#08080a] p-6 lg:p-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-600">Tournament summary</p>
              <div className="mt-6 space-y-3">
                {review.planned.length === 0 && <div className="border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-zinc-500">No tournaments planned.</div>}
                {review.planned.map((node, index) => {
                  const config = readTournamentConfig(node);
                  const connections = readOutgoingConnections(node);
                  return (
                    <div key={node.id} className="border border-white/10 bg-white/[0.03] p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-600">Tournament {index + 1} · {node.nodeType}</p>
                          <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-white">{node.name}</h3>
                          <p className="mt-2 text-sm text-zinc-500">Registration {formatDate(node.registrationDeadline)} · Runs {formatDate(node.startsAt)} to {formatDate(node.endsAt)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 sm:grid-cols-4 lg:min-w-[420px]">
                          <span className="border border-white/10 bg-black/20 px-3 py-2">{config.format ?? 'No format'}</span>
                          <span className="border border-white/10 bg-black/20 px-3 py-2">{config.maxTeams ?? 'No max'} teams</span>
                          <span className="border border-white/10 bg-black/20 px-3 py-2">{config.teamSize ?? 'No'} size</span>
                          <span className="border border-white/10 bg-black/20 px-3 py-2">{connections.length} link{connections.length === 1 ? '' : 's'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="border border-white/10 bg-[#08080a] p-6 lg:p-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-600">Rules summary</p>
              <div className="mt-6 space-y-3">
                {rules.length === 0 && <div className="border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-zinc-500">No scoring or qualification rules configured.</div>}
                {rules.map((rule, index) => {
                  const source = review.planned.find((node) => node.id === rule.sourceNodeId)?.name ?? 'Unknown source';
                  const destination = review.planned.find((node) => node.id === rule.destinationNodeId)?.name ?? 'No destination';
                  return (
                    <div key={rule.id ?? `rule-${index}`} className="grid gap-3 border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400 md:grid-cols-4">
                      <span className="font-semibold text-white">{source}</span>
                      <span>Placement {rule.placementFrom}-{rule.placementTo}</span>
                      <span>{rule.pointsAwarded} point{rule.pointsAwarded === 1 ? '' : 's'}</span>
                      <span>{destination}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <div className="sticky top-24 space-y-6">
              <div className="border border-white/10 bg-[#08080a] p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-600">Validation</p>
                <div className="mt-5 space-y-3">
                  {readyForManagement ? (
                    <div className="flex items-start gap-3 text-sm text-emerald-300"><CheckCircle2 className="mt-0.5 h-4 w-4" />The setup is ready for management.</div>
                  ) : review.blockers.map((blocker) => (
                    <div key={blocker} className="flex items-start gap-3 text-sm text-amber-300"><XCircle className="mt-0.5 h-4 w-4" />{blocker}</div>
                  ))}
                </div>
                <div className="mt-6 grid gap-3">
                  <Button variant="outline" className="rounded-none border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.07]" onClick={() => navigate(`/season/setup/${seasonId}/plan`)}>
                    Back to plan
                  </Button>
                  <Button className="rounded-none bg-rose-500 text-white hover:bg-rose-400 disabled:opacity-50" disabled={!readyForManagement} onClick={() => navigate(`/season/manage/${seasonId}`)}>
                    Enter management realm
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="border border-white/10 bg-[#08080a] p-4"><Trophy className="h-4 w-4 text-rose-400" /><p className="mt-3 text-2xl font-black">{review.planned.length}</p><p className="text-xs text-zinc-500">Tournaments</p></div>
                <div className="border border-white/10 bg-[#08080a] p-4"><Calendar className="h-4 w-4 text-amber-400" /><p className="mt-3 text-2xl font-black">{review.planned.length - review.missingSchedule.length}</p><p className="text-xs text-zinc-500">Scheduled</p></div>
                <div className="border border-white/10 bg-[#08080a] p-4"><Target className="h-4 w-4 text-cyan-400" /><p className="mt-3 text-2xl font-black">{rules.filter((rule) => rule.sourceNodeId).length}</p><p className="text-xs text-zinc-500">Rules</p></div>
                <div className="border border-white/10 bg-[#08080a] p-4"><Link2 className="h-4 w-4 text-violet-400" /><p className="mt-3 text-2xl font-black">{review.connectionCount}</p><p className="text-xs text-zinc-500">Links</p></div>
              </div>

              <div className="border border-white/10 bg-[#08080a] p-6">
                <GitBranch className="h-5 w-5 text-rose-400" />
                <h3 className="mt-4 text-lg font-black uppercase tracking-tight text-white">Management starts after review</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">The management realm is for operating the season after the planned tournament structure is intact.</p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default SeasonSetupReview;
