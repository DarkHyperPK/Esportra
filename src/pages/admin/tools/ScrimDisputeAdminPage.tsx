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
import { useAdminScrimDisputes, useResolveScrimDispute } from '@/hooks/competitive/useScrims';
import { InlineNotice } from '@/components/ui/kit';
import { Loader2 } from 'lucide-react';
import type { AdminScrimDisputeRow, ScrimDisputeOutcome } from '@/types/competitive';

// ── Helpers ───────────────────────────────────────────────────────────────────

const OUTCOME_OPTIONS: { value: ScrimDisputeOutcome; label: string }[] = [
  { value: 'team1_wins', label: 'Team 1 wins' },
  { value: 'team2_wins', label: 'Team 2 wins' },
  { value: 'no_contest', label: 'No contest' },
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
            {OUTCOME_OPTIONS.map((opt) => (
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

// ── DisputeRow ────────────────────────────────────────────────────────────────

function DisputeRow({
  dispute,
  onResolve,
}: {
  dispute: AdminScrimDisputeRow;
  onResolve: () => void;
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
          {dispute.gameSlug && (
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35 bg-white/[0.05] px-1.5 py-0.5">
              {dispute.gameSlug.toUpperCase()}
            </span>
          )}
        </div>
        <p className="text-[12px] text-zinc-400 line-clamp-1">{dispute.reason}</p>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
          <span>Raised by: {dispute.raisedByTeamName ?? dispute.raisedByTeamId.slice(0, 8)}</span>
          <span>Scheduled: {formatScheduledAt(dispute.scheduledAt)}</span>
          <span>{evidenceCount} evidence item{evidenceCount !== 1 ? 's' : ''}</span>
          <span>{timeSince}</span>
        </div>
      </div>
      {dispute.status !== 'resolved' && (
        <button
          onClick={onResolve}
          className="text-[13px] border border-white/[0.08] text-white/55 hover:text-white px-3 py-1.5 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors shrink-0"
        >
          Resolve
        </button>
      )}
      {dispute.status === 'resolved' && dispute.outcome && (
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5">
          {dispute.outcome.replace('_', ' ')}
        </span>
      )}
    </div>
  );
}

// ── ScrimDisputeAdminPage ─────────────────────────────────────────────────────

export default function ScrimDisputeAdminPage() {
  const { can, loading } = useAdminAccess();
  const [statusTab, setStatusTab] = useState<StatusTab>('open');
  const [page, setPage] = useState(1);
  const [resolveTarget, setResolveTarget] = useState<AdminScrimDisputeRow | null>(null);

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
    </div>
  );
}
