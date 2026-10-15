import { useState } from 'react';
import { CommandButton } from '@/components/management/CommandSurface';
import { InlineNotice } from '@/components/ui/kit/InlineNotice';
import { useBroadcastResultProposals, type BroadcastResultProposal } from '@/hooks/useBroadcastResultProposals';

export function BroadcastResultReview({ showId }: { showId: string }) {
  const { query, review } = useBroadcastResultProposals(showId);
  const [selected, setSelected] = useState<{ proposal: BroadcastResultProposal; decision: 'apply' | 'reject' } | null>(null);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  async function confirm() {
    if (!selected) return;
    setError('');
    try {
      await review.mutateAsync(selected);
      setNotice(selected.decision === 'apply' ? 'Official map result applied. Series scores updated.' : 'Proposal rejected. Official result unchanged.');
      setSelected(null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not review this result.'); }
  }
  const pending = query.data?.proposals.filter(proposal => proposal.status === 'pending') ?? [];
  if (query.isLoading || query.data?.proposals.length === 0) return null;
  return <section aria-label="Official result review" className="px-4 py-5 border-t border-white/10">
    <h2 className="text-lg font-semibold">Official result review</h2>
    <p className="text-sm text-white/60 mt-1">Air proposals leave the tournament result unchanged until an authorized crew member approves them. These are operator proposals, not Riot-verified results.</p>
    {query.isLoading && <p role="status">Loading results…</p>}
    {query.isError && <InlineNotice tone="warning">Result review unavailable. <button type="button" className="underline" onClick={() => { void query.refetch(); }}>Retry</button></InlineNotice>}
    {notice && <p role="status" className="mt-3">{notice}</p>}
    {query.data && !query.data.canReview && <p className="text-sm text-white/60 mt-3">Viewing only. Your active crew assignment must have “Can submit results” enabled to approve or reject.</p>}
    {query.data && pending.length === 0 && <p className="text-sm text-white/60 mt-3">No results awaiting review.</p>}
    {pending.map(proposal => <div key={proposal.id} className="py-4 border-b border-white/10">
      <h3 className="font-medium">{proposal.teamAName || 'Team A'} vs {proposal.teamBName || 'Team B'} · Map {proposal.mapNumber}</h3>
      <p className="text-sm mt-1">Official: {proposal.currentTeamAScore === null ? 'No result' : `${proposal.currentTeamAScore}–${proposal.currentTeamBScore}`} → Proposed: <strong>{proposal.teamAScore}–{proposal.teamBScore}</strong></p>
      <p className="text-sm text-white/60 mt-1 break-words">{proposal.reason}</p>
      {query.data?.canReview && <div className="flex gap-2 mt-3">
        <CommandButton disabled={review.isPending} onClick={() => { setSelected({ proposal, decision: 'apply' }); setError(''); }}>Review result</CommandButton>
        <CommandButton variant="ghost" disabled={review.isPending} onClick={() => { setSelected({ proposal, decision: 'reject' }); setError(''); }}>Reject</CommandButton>
      </div>}
    </div>)}
    {selected && <div role="group" aria-label="Confirm result review" className="py-4">
      <h3 className="font-semibold">{selected.decision === 'apply' ? `Apply map ${selected.proposal.mapNumber}: ${selected.proposal.teamAScore}–${selected.proposal.teamBScore}?` : 'Reject this proposal?'}</h3>
      <p className="text-sm mt-2">{selected.decision === 'apply' ? 'This writes the official map result and recalculates the series winner. Finalized matches and results changed since this review are blocked.' : 'The official result stays unchanged. This decision is recorded.'}</p>
      {error && <p role="alert" className="text-red-300 mt-2">{error} Close this review and reload the latest values before retrying.</p>}
      <div className="flex gap-2 mt-3">
        <CommandButton disabled={review.isPending} onClick={() => { void confirm(); }}>{review.isPending ? 'Saving…' : selected.decision === 'apply' ? 'Apply official result' : 'Confirm rejection'}</CommandButton>
        <CommandButton variant="ghost" disabled={review.isPending} onClick={() => { setSelected(null); setError(''); void query.refetch(); }}>Cancel</CommandButton>
      </div>
    </div>}
    {query.data?.proposals.some(proposal => proposal.status !== 'pending') && <details className="mt-4"><summary className="cursor-pointer text-sm">Reviewed results</summary>{query.data.proposals.filter(proposal => proposal.status !== 'pending').map(proposal => <p key={proposal.id} className="text-sm mt-2">{proposal.teamAName} vs {proposal.teamBName} · Map {proposal.mapNumber} · {proposal.teamAScore}–{proposal.teamBScore} · {proposal.status}</p>)}</details>}
  </section>;
}
