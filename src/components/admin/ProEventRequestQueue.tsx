import { useState } from 'react';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useProEventRequestQueue, type ProRequestStatus } from '@/hooks/useProEventRequestQueue';
import { CommandButton } from '@/components/management/CommandSurface';
import { Link } from 'react-router-dom';
import ProEventProofPreview from './ProEventProofPreview';

export default function ProEventRequestQueue() {
  const [status, setStatus] = useState<ProRequestStatus>('pending');
  const [page, setPage] = useState(0);
  const { can } = useAdminAccess();
  const { data, isLoading, error, refetch, update } = useProEventRequestQueue(status, page, can('licenses:view'));
  if (!can('licenses:view')) return null;
  return <section className="space-y-5 border border-white/10 p-4 md:p-6" aria-labelledby="pro-requests-title">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">Pricing page requests</p><h2 id="pro-requests-title" className="font-heading text-xl font-semibold text-white">Pro event briefs</h2><p className="mt-2 text-xs text-zinc-400">Follow up on the event and agree scope and payment separately. A request grants no entitlement.</p></div><CommandButton variant="secondary" size="sm" onClick={() => void refetch()}>Refresh</CommandButton></div>
    <Link to="/admin/system/settings" className="inline-block text-xs text-white underline underline-offset-4">Configure seller, business account and QR under Settings → Pro Payments</Link>
    <label className="flex items-center gap-3 text-xs text-zinc-300">Request status<select className="border border-white/20 bg-zinc-950 p-2 text-white" value={status} onChange={event => { const next = event.target.value; if (next === 'pending' || next === 'contacted' || next === 'closed' || next === 'proof_submitted') { setStatus(next); setPage(0); } }}><option value="pending">Pending payment / quote</option><option value="proof_submitted">Proof submitted</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select></label>
    {isLoading && <p role="status" className="text-sm text-zinc-400">Loading requests…</p>}
    {(error || update.error) && <p role="alert" className="text-sm text-red-300">{(error || update.error)?.message || 'Unable to update requests.'}</p>}
    {data && data.items.length === 0 && <p className="text-sm text-zinc-400">No {status} requests.</p>}
    <div className="grid gap-3">{data?.items.map(row => <article key={row.id} className="grid gap-4 border border-white/10 p-4 lg:grid-cols-[1fr_1fr_auto]">
      <div className="min-w-0"><h3 className="font-semibold text-white">{row.eventName}</h3><p className="mt-1 text-sm text-zinc-400">{row.gameTitle} · {row.teamCount} teams</p><p className="mt-2 text-xs text-zinc-400">{row.startsOn.slice(0, 10)} — {row.endsOn.slice(0, 10)} · PKT</p><p className="mt-2 break-all font-mono text-[10px] text-zinc-500">{row.reference}</p></div>
      <div className="min-w-0"><a className="break-all text-sm text-white underline underline-offset-4" href={`mailto:${encodeURIComponent(row.email)}?subject=${encodeURIComponent(`Esportra Pro event: ${row.eventName} (${row.reference})`)}`}>{row.email}</a><p className="mt-3 text-sm text-zinc-300">{row.estimatedAmount === null ? 'Custom quote required' : `Estimate: PKR ${new Intl.NumberFormat('en-PK').format(row.estimatedAmount)}`}</p><p className="mt-2 text-xs text-zinc-500">Received {new Date(row.createdAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })} PKT</p></div>
      <div className="flex flex-wrap content-start gap-2">{row.hasProof && <ProEventProofPreview requestId={row.id} />}{can('licenses:create') && (['pending', 'contacted', 'closed'] as const).filter(next => next !== status).map(next => <CommandButton key={next} variant="secondary" size="sm" disabled={update.isPending} onClick={() => update.mutate({ id: row.id, next })}>Mark {next}</CommandButton>)}</div>
    </article>)}</div>
    <div className="flex items-center justify-between gap-3"><CommandButton variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous</CommandButton><span className="text-xs text-zinc-400">Page {page + 1}</span><CommandButton variant="ghost" size="sm" disabled={!data?.hasMore} onClick={() => setPage(value => value + 1)}>Next</CommandButton></div>
  </section>;
}
