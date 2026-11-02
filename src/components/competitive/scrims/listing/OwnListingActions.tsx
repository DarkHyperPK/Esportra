/**
 * OwnListingActions
 *
 * Edit / pause / reopen on the left as real buttons; close and delete on the
 * right, quiet. Delete asks twice. Owns the listing mutations.
 */

import { useState } from 'react';
import { OutlineButton } from '@/components/ui/button';
import {
  useCloseListing,
  useDeleteScrimListing,
  usePauseListing,
  useReopenListing,
} from '@/hooks/competitive/useScrims';
import { getApiErrorMessage } from '@/lib/apiClient';
import type { ScrimListing } from '@/types/competitive';

const QUIET = 'rounded-lg px-2.5 py-1.5 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-30';

interface OwnListingActionsProps {
  listing: ScrimListing;
  editing: boolean;
  onToggleEdit: () => void;
}

export function OwnListingActions({ listing, editing, onToggleEdit }: OwnListingActionsProps) {
  const pause = usePauseListing(listing.id);
  const reopen = useReopenListing(listing.id);
  const close = useCloseListing(listing.id);
  const del = useDeleteScrimListing(listing.id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  const busy = pause.isPending || reopen.isPending || close.isPending || del.isPending;
  const editable = listing.status === 'open' || listing.status === 'paused';

  async function onDelete() {
    setError('');
    try {
      await del.mutateAsync();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not delete listing.'));
      setConfirmDelete(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {editable && (
            <OutlineButton size="sm" aria-pressed={editing} onClick={onToggleEdit} className="h-9 px-3 text-[12px] rounded-lg font-sans text-[13px] font-semibold normal-case tracking-normal">
              {editing ? 'Close editor' : 'Edit'}
            </OutlineButton>
          )}
          {listing.status === 'open' && (
            <OutlineButton size="sm" onClick={() => pause.mutate()} disabled={busy} className="h-9 px-3 rounded-lg font-sans text-[13px] font-semibold normal-case tracking-normal">
              {pause.isPending ? 'Pausing…' : 'Pause'}
            </OutlineButton>
          )}
          {listing.status === 'paused' && (
            <OutlineButton size="sm" onClick={() => reopen.mutate()} disabled={busy} className="h-9 px-3 rounded-lg font-sans text-[13px] font-semibold normal-case tracking-normal">
              {reopen.isPending ? 'Reopening…' : 'Reopen'}
            </OutlineButton>
          )}
        </div>

        <div className="flex items-center gap-1">
          {listing.status !== 'closed' && (
            <button type="button" onClick={() => close.mutate()} disabled={busy} className={`${QUIET} text-white/45 hover:bg-white/[0.06] hover:text-white`}>
              {close.isPending ? 'Closing…' : 'Close'}
            </button>
          )}
          {confirmDelete ? (
            <>
              <button type="button" onClick={onDelete} disabled={del.isPending} className={`${QUIET} text-red-300 hover:bg-red-500/10`}>
                {del.isPending ? 'Deleting…' : 'Confirm delete'}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className={`${QUIET} text-white/40 hover:text-white`}>
                Keep
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} disabled={busy} className={`${QUIET} text-white/35 hover:bg-red-500/10 hover:text-red-300`}>
              Delete
            </button>
          )}
        </div>
      </div>
      {error && <p role="alert" className="text-[12px] text-red-300">{error}</p>}
    </div>
  );
}
