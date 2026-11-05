/**
 * ScrimDisputeAdminPage — PROJ-078 Admin surface
 *
 * Gated: requires disputes:view permission (same as ADMIN_ROLE_SETS.disputes).
 * Lists open scrim disputes; allows staff to resolve via inline modal.
 * Follows existing admin tool page conventions (PublicVetoSessions pattern).
 */

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useAdminResetScrimTime, useAdminScrimDisputes, useAdminScrimDisputeDetail, useResolveScrimDispute } from '@/hooks/competitive/useScrims';
import { InlineNotice } from '@/components/ui/kit';
import { Loader2, X } from 'lucide-react';
import type { AdminScrimDisputeRow, AdminScrimDisputeGame, ScrimDisputeOutcome } from '@/types/competitive';

// ── Helpers ───────────────────────────────────────────────────────────────────

const outcomeOptions = (mapDispute: boolean): { value: ScrimDisputeOutcome; label: string }[] => [
  { value: 'team1_wins', label: mapDispute ? 'Team 1 won this map' : 'Team 1 wins' },
  { value: 'team2_wins', label: mapDispute ? 'Team 2 won this map' : 'Team 2 wins' },
  { value: 'no_contest', label: mapDispute ? 'No contest — replay the map' : 'No contest' },
];

const STATUS_TABS = ['open', 'escalated', 'resolved'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

function formatScheduledAt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

// ── ResolveModal ──────────────────────────────────────────────────────────────

function ResolveModal({
  dispute,
  onClose,
}: {
  dispute: AdminScrimDisputeRow;
  onClose: () => void;
}) {
  const resolve = useResolveScrimDispute(dispute.id);
  const [outcome, setOutcome] = useState<ScrimDisputeOutcome>('no_contest');
  const [notes, setNotes] = useState('');
  const [resolved, setResolved] = useState(false);

  async function handleResolve() {
    try {
      await resolve.mutateAsync({ outcome, resolutionNotes: notes.trim() || undefined });
      setResolved(true);
    } catch {
      // shown via resolve.isError
    }
  }

  if (resolved) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Resolve dispute"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-zinc-900 border border-white/[0.08] w-full max-w-md p-6 space-y-4">
          <InlineNotice tone="success">Dispute resolved.</InlineNotice>
          <button
            onClick={onClose}
            className="text-[13px] border border-white/[0.08] text-white/55 hover:text-white px-4 py-1.5 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resolve-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-900 border border-white/[0.08] w-full max-w-md p-6 space-y-4">
        <h2 id="resolve-title" className="font-heading text-[18px] font-bold text-white">
          Resolve Dispute
        </h2>

        <div className="space-y-1">
          <p className="text-[12px] text-zinc-500">Reason</p>
          <p className="text-[14px] text-white/80 line-clamp-3">{dispute.reason}</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="outcome-select" className="block text-[13px] text-zinc-300">
            Outcome
          </label>
          <select
            id="outcome-select"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as ScrimDisputeOutcome)}
            className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white focus:outline-none focus:border-white/30 transition-colors"
          >
            {outcomeOptions(dispute.gameNumber != null).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="resolution-notes" className="block text-[13px] text-zinc-300">
            Resolution notes <span className="text-zinc-500">(optional, max 500 chars)</span>
          </label>
          <textarea
            id="resolution-notes"
            rows={3}
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add context for both teams…"
            className="w-full border border-white/10 bg-black/30 px-3 py-2 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-none transition-colors"
          />
          <p className="text-[11px] text-zinc-500 text-right">{notes.length}/500</p>
        </div>

        {resolve.isError && (
          <InlineNotice tone="critical">Couldn&apos;t resolve dispute. Try again.</InlineNotice>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="text-[13px] border border-white/[0.08] text-white/55 hover:text-white px-4 py-1.5 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleResolve()}
            disabled={resolve.isPending}
            aria-busy={resolve.isPending}
            className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-[13px] px-4 py-1.5 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors"
          >
            {resolve.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Resolving…
              </span>
            ) : (
              'Resolve'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function EvidenceLinks({ label, urls }: { label: string; urls: string[] | null }) {
  if (!urls?.length) return null;
  return (
    <div className="text-[12px] text-zinc-400">
      <span className="text-zinc-500">{label}: </span>
      {urls.map((url, i) => (
        <a key={url} href={url} target="_blank" rel="noreferrer noopener" className="mr-3 text-sky-300 underline underline-offset-2 hover:text-sky-200">
          Item {i + 1}
        </a>
      ))}
    </div>
  );
}

/** Clears the scrim's agreed time (and check-ins) so the teams agree a new one. Asks first. */
function ResetTimeButton({ sessionId }: { sessionId: string }) {
  const reset = useAdminResetScrimTime(sessionId);
  const [confirming, setConfirming] = useState(false);
  if (reset.isSuccess) return <span className="px-2 py-1.5 text-[12px] text-emerald-300">Time cleared</span>;
  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="text-[13px] border border-white/[0.08] text-white/55 hover:text-white px-3 py-1.5 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors">
        Clear scrim time
      </button>
    );
  }
  return (
    <span className="flex items-center gap-2 text-[12px] text-amber-200">
      Clear time and check-ins?
      <button onClick={() => reset.mutate(undefined, { onSettled: () => setConfirming(false) })} disabled={reset.isPending} className="border border-amber-400/40 px-2 py-1 text-amber-100 hover:bg-amber-400/10 disabled:opacity-50">
        {reset.isPending ? 'Clearing…' : 'Yes'}
      </button>
      <button onClick={() => setConfirming(false)} className="px-2 py-1 text-white/55 hover:text-white">No</button>
    </span>
  );
}

// ── DisputeDetailSheet ────────────────────────────────────────────────────────

function GameRow({ game, team1Name, team2Name }: { game: AdminScrimDisputeGame; team1Name: string | null; team2Name: string | null }) {
  const winner =
    game.winnerSlot === 1 ? (team1Name ?? 'Team 1')
    : game.winnerSlot === 2 ? (team2Name ?? 'Team 2')
    : game.status === 'disputed' ? 'Disputed'
    : '—';

  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 gap-y-0.5 items-start py-2 border-b border-white/[0.05] last:border-0 text-[13px]">
      <span className="text-zinc-500 font-mono w-6">G{game.gameNumber}</span>
      <div className="min-w-0">
        <span className="text-white/80">{game.mapName ?? '—'}</span>
        {game.notes && <p className="text-[11px] text-zinc-500 truncate">{game.notes}</p>}
      </div>
      <span className="text-white/60 tabular-nums">{game.team1Score}–{game.team2Score}</span>
      <div className="text-right space-y-0.5">
        <span className={[
          'text-[11px] font-semibold',
          game.status === 'disputed' ? 'text-amber-300' : game.status === 'confirmed' ? 'text-emerald-300' : 'text-zinc-400',
        ].join(' ')}>
          {winner}
        </span>
        {game.screenshotUrls?.length ? (
          <div className="flex gap-1 justify-end flex-wrap">
            {game.screenshotUrls.map((url, i) => (
              <a key={url} href={url} target="_blank" rel="noreferrer noopener" className="text-[10px] text-sky-300 underline underline-offset-2 hover:text-sky-200">
                Shot {i + 1}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DisputeDetailSheet({ disputeId, onClose }: { disputeId: string; onClose: () => void }) {
  const { data, isLoading, isError, refetch } = useAdminScrimDisputeDetail(disputeId);
  const dispute = data?.dispute;
  const games = data?.games ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Dispute details"
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative h-full w-full max-w-xl bg-zinc-950 border-l border-white/[0.08] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.08] sticky top-0 bg-zinc-950 z-10">
          <h2 className="font-heading text-[17px] font-bold text-white">Dispute Details</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-zinc-400 hover:text-white transition-colors rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-5 space-y-6">
          {isLoading ? (
            <div className="flex items-center gap-2 text-zinc-400 text-sm py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading details…
            </div>
          ) : isError ? (
            <InlineNotice tone="critical" action={
              <button onClick={() => void refetch()} className="text-[12px] border border-white/[0.08] text-white/55 hover:text-white px-3 py-1 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
                Retry
              </button>
            }>
              Could not load dispute details.
            </InlineNotice>
          ) : dispute ? (
            <>
              {/* Session info */}
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mb-3">Match</h3>
                <div className="bg-white/[0.03] border border-white/[0.06] p-4 space-y-2">
                  <div className="flex items-center gap-3 text-[14px] text-white font-medium">
                    <span>{dispute.team1Name ?? '—'}</span>
                    <span className="tabular-nums text-white/50">{dispute.team1Score}–{dispute.team2Score}</span>
                    <span>{dispute.team2Name ?? '—'}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-zinc-400">
                    {dispute.gameSlug && <span className="font-mono uppercase tracking-[0.15em] text-[10px] text-white/35 bg-white/[0.05] px-1.5 py-0.5">{dispute.gameSlug.toUpperCase()}</span>}
                    {dispute.bestOf && <span>Best of {dispute.bestOf}</span>}
                    {dispute.matchFormat && <span>{dispute.matchFormat}</span>}
                    <span className={[
                      'font-semibold',
                      dispute.sessionStatus === 'completed' ? 'text-emerald-300' :
                      dispute.sessionStatus === 'in_progress' ? 'text-sky-300' : 'text-zinc-400',
                    ].join(' ')}>
                      {dispute.sessionStatus.replace('_', ' ')}
                    </span>
                  </div>
                  {dispute.scheduledAt && (
                    <p className="text-[12px] text-zinc-500">
                      Scheduled: {new Date(dispute.scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  )}
                </div>
              </section>

              {/* Dispute info */}
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mb-3">Dispute</h3>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span className={[
                      'px-2 py-0.5 font-semibold text-[11px] uppercase tracking-[0.12em] border',
                      dispute.status === 'open' ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' :
                      dispute.status === 'escalated' ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' :
                      'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
                    ].join(' ')}>
                      {dispute.status}
                    </span>
                    {dispute.gameNumber != null && (
                      <span className="bg-amber-400/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-200">
                        Game {dispute.gameNumber}
                      </span>
                    )}
                    <span className="text-zinc-400">raised by {dispute.raisedByTeamName ?? dispute.raisedByTeamId.slice(0, 8)}</span>
                  </div>
                  <p className="text-[14px] text-white/80">{dispute.reason}</p>
                  <p className="text-[11px] text-zinc-500">
                    Raised {formatDistanceToNow(new Date(dispute.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </section>

              {/* Evidence */}
              {((dispute.evidenceUrls?.length ?? 0) + (dispute.responderEvidenceUrls?.length ?? 0)) > 0 && (
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mb-3">Evidence</h3>
                  <div className="space-y-2">
                    <EvidenceLinks label={`${dispute.raisedByTeamName ?? 'Raised by'}`} urls={dispute.evidenceUrls} />
                    <EvidenceLinks label="Other team" urls={dispute.responderEvidenceUrls} />
                    {dispute.responderNotes && (
                      <p className="text-[13px] text-zinc-400 italic">&ldquo;{dispute.responderNotes}&rdquo;</p>
                    )}
                  </div>
                </section>
              )}

              {/* Per-game results */}
              {games.length > 0 && (
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mb-3">
                    Games ({games.length})
                  </h3>
                  <div className="bg-white/[0.02] border border-white/[0.06] px-3 divide-y divide-white/[0.04]">
                    {games.map((g) => (
                      <GameRow key={g.gameNumber} game={g} team1Name={dispute.team1Name} team2Name={dispute.team2Name} />
                    ))}
                  </div>
                </section>
              )}

              {/* Resolution */}
              {dispute.status === 'resolved' && (
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mb-3">Resolution</h3>
                  <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 space-y-2">
                    {dispute.outcome && (
                      <p className="font-semibold text-emerald-300 text-[13px] uppercase tracking-[0.12em]">
                        {dispute.outcome.replace('_', ' ')}
                      </p>
                    )}
                    {dispute.resolvedByUsername && (
                      <p className="text-[12px] text-zinc-400">Resolved by <span className="text-white/70">{dispute.resolvedByUsername}</span></p>
                    )}
                    {dispute.resolvedAt && (
                      <p className="text-[12px] text-zinc-500">
                        {new Date(dispute.resolvedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    )}
                    {dispute.resolutionNotes && (
                      <p className="text-[13px] text-white/70 mt-1">{dispute.resolutionNotes}</p>
                    )}
                  </div>
                </section>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── DisputeRow ────────────────────────────────────────────────────────────────

function DisputeRow({
  dispute,
  onResolve,
  onView,
}: {
  dispute: AdminScrimDisputeRow;
  onResolve: () => void;
  onView: () => void;
}) {
  const evidenceCount =
    (dispute.evidenceUrls?.length ?? 0) + (dispute.responderEvidenceUrls?.length ?? 0);
  const timeSince = formatDistanceToNow(new Date(dispute.createdAt), { addSuffix: true });

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] py-3">
      <div className="space-y-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-white">
          <span className="font-medium">{dispute.team1Name ?? '—'}</span>
          <span className="text-white/30">vs</span>
          <span className="font-medium">{dispute.team2Name ?? '—'}</span>
          {dispute.gameNumber != null && (
            <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-200">
              Game {dispute.gameNumber}
            </span>
          )}
          {dispute.gameSlug && (
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35 bg-white/[0.05] px-1.5 py-0.5">
              {dispute.gameSlug.toUpperCase()}
            </span>
          )}
        </div>
        <p className="text-[12px] text-zinc-400">{dispute.reason}</p>
        <EvidenceLinks label={`${dispute.raisedByTeamName ?? 'Raised by'} evidence`} urls={dispute.evidenceUrls} />
        <EvidenceLinks label="Other team evidence" urls={dispute.responderEvidenceUrls} />
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
          <span>Raised by: {dispute.raisedByTeamName ?? dispute.raisedByTeamId.slice(0, 8)}</span>
          <span>Scheduled: {formatScheduledAt(dispute.scheduledAt)}</span>
          <span>{evidenceCount} evidence item{evidenceCount !== 1 ? 's' : ''}</span>
          <span>{timeSince}</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 items-center">
        <button
          onClick={onView}
          className="text-[13px] border border-white/[0.08] text-white/55 hover:text-white px-3 py-1.5 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors shrink-0"
        >
          View
        </button>
        {dispute.status !== 'resolved' && (
          <>
            <ResetTimeButton sessionId={dispute.sessionId} />
            <button
              onClick={onResolve}
              className="text-[13px] border border-white/[0.08] text-white/55 hover:text-white px-3 py-1.5 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors shrink-0"
            >
              Resolve
            </button>
          </>
        )}
        {dispute.status === 'resolved' && dispute.outcome && (
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5">
            {dispute.outcome.replace('_', ' ')}
          </span>
        )}
      </div>
    </div>
  );
}

// ── ScrimDisputeAdminPage ─────────────────────────────────────────────────────

export default function ScrimDisputeAdminPage() {
  const { can, loading } = useAdminAccess();
  const [statusTab, setStatusTab] = useState<StatusTab>('open');
  const [page, setPage] = useState(1);
  const [resolveTarget, setResolveTarget] = useState<AdminScrimDisputeRow | null>(null);
  const [detailTargetId, setDetailTargetId] = useState<string | null>(null);

  const canView = can('disputes:view');
  const query = useAdminScrimDisputes(statusTab, page, !loading && canView);
  const pageCount = Math.max(1, Math.ceil((query.data?.total ?? 0) / 20));

  if (loading) {
    return <p className="p-4 text-sm text-zinc-400" role="status">Loading admin access…</p>;
  }
  if (!canView) {
    return (
      <div className="p-4 md:p-6">
        <InlineNotice title="Access denied" tone="critical">
          You need the disputes:view permission to view scrim disputes.
        </InlineNotice>
      </div>
    );
  }

  const disputes = query.data?.items ?? [];

  return (
    <div className="min-w-0 w-full space-y-6 p-4 md:p-6">
      <header>
        <h1 className="font-heading text-[22px] font-bold tracking-tight text-white sm:text-2xl">
          Scrim Disputes
        </h1>
        <p className="mt-1 text-sm text-zinc-400">Review and resolve disputes between scrim participants.</p>
      </header>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-white/[0.08]">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => { setStatusTab(tab); setPage(1); }}
            className={[
              'px-4 py-2 text-[13px] font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
              statusTab === tab
                ? 'text-white border-b-2 border-rose-500'
                : 'text-zinc-400 hover:text-white',
            ].join(' ')}
          >
            {tab}
          </button>
        ))}
      </div>

      <section aria-label="Scrim dispute list" aria-busy={query.isFetching}>
        {query.isError ? (
          <InlineNotice
            tone="critical"
            action={
              <button
                onClick={() => void query.refetch()}
                className="text-[12px] border border-white/[0.08] text-white/55 hover:text-white px-3 py-1 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                Retry
              </button>
            }
          >
            Couldn&apos;t load disputes. Check your connection and try again.
          </InlineNotice>
        ) : query.isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-white/[0.04] border border-white/[0.04]" />
            ))}
          </div>
        ) : disputes.length === 0 ? (
          <p className="py-8 text-center text-[14px] text-zinc-400">
            No {statusTab} disputes.
          </p>
        ) : (
          <div>
            {disputes.map((dispute) => (
              <DisputeRow
                key={dispute.id}
                dispute={dispute}
                onResolve={() => setResolveTarget(dispute)}
                onView={() => setDetailTargetId(dispute.id)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {query.data && pageCount > 1 && (
          <div className="flex items-center justify-between gap-3 pt-4">
            <p className="text-[13px] text-zinc-400">
              Page {page} of {pageCount} · {query.data.total} total
            </p>
            <div className="flex gap-2">
              <button
                disabled={query.isFetching || page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="text-[13px] border border-white/[0.08] text-white/55 hover:text-white disabled:opacity-40 px-3 py-1.5 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={query.isFetching || page >= pageCount}
                onClick={() => setPage((p) => p + 1)}
                className="text-[13px] border border-white/[0.08] text-white/55 hover:text-white disabled:opacity-40 px-3 py-1.5 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {resolveTarget && (
        <ResolveModal dispute={resolveTarget} onClose={() => setResolveTarget(null)} />
      )}
      {detailTargetId && (
        <DisputeDetailSheet disputeId={detailTargetId} onClose={() => setDetailTargetId(null)} />
      )}
    </div>
  );
}
