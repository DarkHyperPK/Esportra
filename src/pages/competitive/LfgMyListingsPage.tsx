import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyLfgListings, useDeleteLfgListing, usePublishLfgListing, usePauseLfgListing } from '@/hooks/competitive/useLfg';
import { LfgWorkspace } from '@/components/competitive/LfgWorkspace';
import { LfgListingCard } from '@/components/competitive/LfgListingCard';
import { useCatalogGameRoles } from '@/hooks/competitive/useCatalog';
import type { LfgListing } from '@/types/competitive';

function ListingRow({ listing }: { listing: LfgListing }) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const remove = useDeleteLfgListing(listing.id);
  const publish = usePublishLfgListing(listing.id);
  const pause = usePauseLfgListing(listing.id);
  const roles = useCatalogGameRoles(listing.gameSlug);
  const team = listing.intent !== 'looking_for_team';
  const expired = !!listing.expiresAt && new Date(listing.expiresAt).getTime() <= Date.now() && !['removed','closed'].includes(listing.status);
  const pending = remove.isPending || publish.isPending || pause.isPending;
  async function action(type: 'delete' | 'publish' | 'pause') {
    setError('');
    try { if (type === 'delete') await remove.mutateAsync(); else if (type === 'publish') await publish.mutateAsync(); else await pause.mutateAsync(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update listing. Try again.'); }
  }
  return <article className="lfg-owned-card">
    <div className="lfg-grid lfg-owned-preview"><LfgListingCard listing={listing} roles={roles.data ?? []} selected={false} onSelect={() => {}} onSave={() => {}} savePending={false} isOwn preview /></div>
    <div className="lfg-owned-controls"><div className="lfg-owned-meta"><span>{listing.gameSlug} · {team ? 'Recruiting players' : 'Looking for a team'}</span><strong>{expired ? 'Expired' : listing.status}</strong></div>
      {error && <p className="lfg-error" role="alert">{error}</p>}
      <div className="lfg-row-actions"><Link className="lfg-button lfg-button-primary" to={`/competitive/lfg/${listing.id}`}>Manage</Link>{['draft','published','paused'].includes(listing.status) && <Link className="lfg-button" to={`/competitive/lfg/${listing.id}/edit`}>{expired ? 'Extend expiry' : 'Edit'}</Link>}{!expired && listing.status === 'published' && <button type="button" className="lfg-button" disabled={pending} onClick={() => void action('pause')}>Pause</button>}{!expired && ['draft','paused'].includes(listing.status) && <button type="button" className="lfg-button" disabled={pending} onClick={() => void action('publish')}>{listing.status === 'draft' ? 'Publish' : 'Resume'}</button>}{confirm ? <><button type="button" className="lfg-button" disabled={pending} onClick={() => void action('delete')}>Confirm delete</button><button type="button" className="lfg-button" onClick={() => setConfirm(false)}>Cancel</button></> : <button type="button" className="lfg-button" onClick={() => setConfirm(true)}>Delete</button>}</div>
      {confirm && <p className="lfg-sub" style={{ marginTop:8 }}>Deleting this listing also removes its requests.</p>}
    </div>
  </article>;
}

export default function LfgMyListingsPage() {
  const listings = useMyLfgListings();
  return <LfgWorkspace><header className="lfg-heading"><div><div className="lfg-eyebrow">Find a group / My listings</div><h1>Your place on the board.</h1><p>Keep your listings current and review requests.</p></div></header><div className="lfg-page">
    {listings.isLoading ? <div className="lfg-panel lfg-empty">Loading listings…</div> : listings.isError ? <div className="lfg-panel lfg-empty"><strong>Listings could not load.</strong><button className="lfg-button" type="button" onClick={() => void listings.refetch()}>Try again</button></div> : !listings.data?.length ? <div className="lfg-panel lfg-empty"><strong>No listings yet.</strong><Link className="lfg-button lfg-button-primary" to="/competitive/lfg/create">Create listing</Link></div> : <div className="lfg-owned-grid">{listings.data.map(listing => <ListingRow key={listing.id} listing={listing} />)}</div>}
  </div></LfgWorkspace>;
}
