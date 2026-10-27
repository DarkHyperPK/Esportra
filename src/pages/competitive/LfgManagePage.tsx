import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCatalogGameRoles } from '@/hooks/competitive/useCatalog';
import { useLfgListing, useLfgInterests, usePublishLfgListing, usePauseLfgListing, useDeleteLfgListing, useAcceptInterest, useDeclineInterest } from '@/hooks/competitive/useLfg';
import { LfgWorkspace } from '@/components/competitive/LfgWorkspace';
import { LfgListingDetail } from '@/components/competitive/LfgListingDetail';

export default function LfgManagePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const listing = useLfgListing(id);
  const own = !!listing.data && listing.data.userId === user?.id;
  const expired = !!listing.data?.expiresAt && new Date(listing.data.expiresAt).getTime() <= Date.now();
  const interests = useLfgInterests(id, own);
  const roles = useCatalogGameRoles(listing.data?.gameSlug || '');
  const publish = usePublishLfgListing(id);
  const pause = usePauseLfgListing(id);
  const remove = useDeleteLfgListing(id);
  const accept = useAcceptInterest(id);
  const decline = useDeclineInterest(id);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  async function action(type: 'publish' | 'pause' | 'delete' | 'accept' | 'decline', interestId?: string) {
    setError('');
    try {
      if (type === 'publish') await publish.mutateAsync();
      if (type === 'pause') await pause.mutateAsync();
      if (type === 'delete') { await remove.mutateAsync(); navigate('/competitive/lfg/mine'); }
      if (type === 'accept' && interestId) { const result = await accept.mutateAsync(interestId); if (result.conversationId) navigate(`/inbox/${result.conversationId}`); }
      if (type === 'decline' && interestId) await decline.mutateAsync(interestId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update listing. Try again.'); }
  }
  return <LfgWorkspace><header className="lfg-heading"><div><div className="lfg-eyebrow">Find a group / Listing</div><h1>{own ? 'Manage your listing.' : 'Listing details.'}</h1><p>{own ? 'Review your listing and requests.' : 'See what they are looking for.'}</p></div></header><div className="lfg-page">
    {listing.isLoading ? <div className="lfg-panel lfg-empty">Loading listing…</div> : listing.isError || !listing.data ? <div className="lfg-panel lfg-empty"><strong>Listing is unavailable.</strong><button type="button" className="lfg-button" onClick={() => void listing.refetch()}>Try again</button></div> : <>
      <div className="lfg-panel" style={{ maxWidth:760 }}><LfgListingDetail listing={listing.data} roles={roles.data ?? []} currentUserId={user?.id} showOwnerLink={false} />
        {own && <div style={{ padding:'0 20px 20px' }}><div className="lfg-row-actions">{['draft','published','paused'].includes(listing.data.status) && <Link className="lfg-button" to={`/competitive/lfg/${id}/edit`}>{expired ? 'Extend expiry' : 'Edit'}</Link>}{!expired && listing.data.status === 'published' && <button className="lfg-button" type="button" disabled={pause.isPending} onClick={() => void action('pause')}>Pause</button>}{!expired && ['draft','paused'].includes(listing.data.status) && <button className="lfg-button lfg-button-primary" type="button" disabled={publish.isPending} onClick={() => void action('publish')}>{listing.data.status === 'draft' ? 'Publish' : 'Resume'}</button>}{confirm ? <><button className="lfg-button" type="button" disabled={remove.isPending} onClick={() => void action('delete')}>Confirm delete</button><button className="lfg-button" type="button" onClick={() => setConfirm(false)}>Cancel</button></> : <button className="lfg-button" type="button" onClick={() => setConfirm(true)}>Delete</button>}</div>{confirm && <p className="lfg-sub" style={{ marginTop:8 }}>Deleting this listing also removes its requests.</p>}</div>}
      </div>
      {own && <section style={{ marginTop:24, maxWidth:760 }}><h2 className="lfg-name" style={{ marginBottom:12 }}>Requests</h2>{interests.isLoading ? <div className="lfg-panel lfg-empty">Loading requests…</div> : interests.isError ? <div className="lfg-panel lfg-empty"><strong>Requests could not load.</strong><button className="lfg-button" type="button" onClick={() => void interests.refetch()}>Try again</button></div> : !interests.data?.length ? <div className="lfg-panel lfg-empty">No requests yet.</div> : <div className="lfg-panel">{interests.data.map(item => <article className="lfg-row" key={item.id}><span className="lfg-avatar">{(item.username || '?').slice(0,2).toUpperCase()}</span><div className="lfg-row-body"><strong>{item.username || 'Player'}</strong><p className="lfg-sub">{item.status}</p><p className="lfg-description">{item.message}</p></div>{item.status === 'expressed' && <div className="lfg-row-actions"><button className="lfg-button lfg-button-primary" type="button" disabled={accept.isPending || decline.isPending} onClick={() => void action('accept', item.id)}>Accept</button><button className="lfg-button" type="button" disabled={accept.isPending || decline.isPending} onClick={() => void action('decline', item.id)}>Decline</button></div>}</article>)}</div>}</section>}
    </>}{error && <p className="lfg-error" role="alert">{error}</p>}
  </div></LfgWorkspace>;
}
