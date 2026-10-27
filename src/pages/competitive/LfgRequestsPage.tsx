import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAcceptInterest, useDeclineInterest, useLfgInbox, useWithdrawInterest } from '@/hooks/competitive/useLfg';
import { LfgWorkspace } from '@/components/competitive/LfgWorkspace';
import type { LfgInboxEntry } from '@/types/competitive';

function RequestRow({ item, received }: { item: LfgInboxEntry; received: boolean }) {
  const navigate = useNavigate();
  const accept = useAcceptInterest(item.listingId);
  const decline = useDeclineInterest(item.listingId);
  const withdraw = useWithdrawInterest(item.listingId);
  const [error, setError] = useState('');
  async function respond(action: 'accept' | 'decline' | 'withdraw') {
    setError('');
    try {
      if (action === 'accept') { const result = await accept.mutateAsync(item.id); if (result.conversationId) navigate(`/inbox/${result.conversationId}`); }
      else if (action === 'decline') await decline.mutateAsync(item.id);
      else await withdraw.mutateAsync();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update request. Try again.'); }
  }
  const pending = accept.isPending || decline.isPending || withdraw.isPending;
  return <article className="lfg-row"><span className="lfg-avatar">{(item.counterpartUsername || '?').slice(0, 2).toUpperCase()}</span><div className="lfg-row-body"><h2 className="lfg-name">{item.counterpartUsername || 'Player'}</h2><p className="lfg-sub">{item.listingName || 'Listing'} · {item.gameSlug} · {item.status}</p>{item.message && <p className="lfg-description" style={{ marginTop:8 }}>{item.message}</p>}{error && <p className="lfg-error" role="alert">{error}</p>}</div><div className="lfg-row-actions">
    {item.status === 'expressed' && (received ? <><button className="lfg-button lfg-button-primary" type="button" disabled={pending} onClick={() => void respond('accept')}>Accept</button><button className="lfg-button" type="button" disabled={pending} onClick={() => void respond('decline')}>Decline</button></> : <button className="lfg-button" type="button" disabled={pending} onClick={() => void respond('withdraw')}>Withdraw</button>)}
    {item.status === 'accepted' && item.conversationId && <Link className="lfg-button lfg-button-primary" to={`/inbox/${item.conversationId}`}>Open conversation</Link>}
    {received && <Link className="lfg-button" to={`/competitive/lfg/${item.listingId}`}>View listing</Link>}
  </div></article>;
}

export default function LfgRequestsPage() {
  const [params, setParams] = useSearchParams();
  const direction = params.get('tab') === 'sent' ? 'sent' : 'received';
  const [offset, setOffset] = useState(0);
  const requests = useLfgInbox(direction, params.get('game') || undefined, offset);
  function changeTab(tab: 'received' | 'sent') { const next = new URLSearchParams(params); next.set('tab', tab); setParams(next); setOffset(0); }
  return <LfgWorkspace><header className="lfg-heading"><div><div className="lfg-eyebrow">Find a group / Requests</div><h1>Good teams start here.</h1><p>Review introductions and keep track of your requests.</p></div></header><div className="lfg-page"><div className="lfg-tools"><div className="lfg-segmented"><button type="button" aria-pressed={direction === 'received'} onClick={() => changeTab('received')}>Received</button><button type="button" aria-pressed={direction === 'sent'} onClick={() => changeTab('sent')}>Sent</button></div></div>
    {requests.isLoading ? <div className="lfg-panel lfg-empty">Loading requests…</div> : requests.isError ? <div className="lfg-panel lfg-empty"><strong>Requests could not load.</strong><button type="button" className="lfg-button" onClick={() => void requests.refetch()}>Try again</button></div> : !requests.data?.length ? <div className="lfg-panel lfg-empty"><strong>No {direction} requests.</strong><Link className="lfg-button" to="/competitive/lfg">Explore listings</Link></div> : <div className="lfg-panel">{requests.data.map(item => <RequestRow key={item.id} item={item} received={direction === 'received'} />)}</div>}
    <div className="lfg-row-actions" style={{ marginTop:16 }}>{offset > 0 && <button className="lfg-button" type="button" onClick={() => setOffset(Math.max(0, offset - 30))}>Previous</button>}{requests.data?.length === 30 && <button className="lfg-button" type="button" onClick={() => setOffset(offset + 30)}>Next</button>}</div>
  </div></LfgWorkspace>;
}
