/**
 * ScrimOfferForm.tsx
 *
 * Inline offer form that expands below a ScrimDiscoveryCard (PROJ-077 T10).
 * Upgraded copy: "Block length (min)", "Message to team", "Request Scrim".
 * Game-aware team filter: only shows teams whose gameSlug matches the listing.
 */

import { useState } from 'react';
import { InlineNotice, Field, EYEBROW_CLASS } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { useMakeOffer } from '@/hooks/competitive/useScrims';
import { useMyTeamsSummary } from '@/hooks/useNavTeamStatus';
import { getApiErrorMessage } from '@/lib/apiClient';

interface ScrimOfferFormProps {
  listingId: string;
  gameSlug: string | null;
  prefilledProposedAt?: string;
  onClose: () => void;
}

export function ScrimOfferForm({
  listingId,
  gameSlug,
  prefilledProposedAt,
  onClose,
}: ScrimOfferFormProps) {
  const offerMutation = useMakeOffer(listingId);
  const teamsQuery = useMyTeamsSummary();
  const allTeams = (teamsQuery.data ?? []) as {
    id: string;
    name: string;
    gameSlug?: string | null;
  }[];
  const teams = gameSlug
    ? allTeams.filter((t) => !t.gameSlug || t.gameSlug === gameSlug)
    : allTeams;

  const [offeringTeamId, setOfferingTeamId] = useState('');
  const [proposedAt, setProposedAt] = useState(prefilledProposedAt ?? '');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [teamIdError, setTeamIdError] = useState('');
  const [apiError, setApiError] = useState('');

  const resolvedTeamId = offeringTeamId || teams[0]?.id || '';

  async function handleSubmit() {
    setApiError('');
    setTeamIdError('');
    if (!resolvedTeamId) {
      setTeamIdError('You need to be on a team to send an offer.');
      return;
    }
    try {
      await offerMutation.mutateAsync({
        offeringTeamId: resolvedTeamId,
        proposedAt: proposedAt || undefined,
        proposedDurationMinutes: duration ? parseInt(duration, 10) : undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Could not send offer. Try again.'));
    }
  }

  return (
    <div className="border border-white/10 bg-black/40 p-4 space-y-3 mt-1">
      <p className={EYEBROW_CLASS}>SEND SCRIM OFFER</p>
      {teams.length > 1 && (
        <Field label="Your team" htmlFor={`oti-${listingId}`}>
          <select
            id={`oti-${listingId}`}
            value={offeringTeamId}
            onChange={(e) => setOfferingTeamId(e.target.value)}
            className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white focus:outline-none focus:border-white/30"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {teamIdError && (
            <p role="alert" className="text-xs text-red-300 mt-1">
              {teamIdError}
            </p>
          )}
        </Field>
      )}
      {teams.length === 0 && teamIdError && (
        <p role="alert" className="text-xs text-red-300">
          {teamIdError}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Proposed date & time" htmlFor={`oat-${listingId}`} optional>
          {prefilledProposedAt ? (
            <div className="h-10 flex items-center border border-white/10 bg-black/20 px-3 text-[14px] text-white/60">
              {prefilledProposedAt}
            </div>
          ) : (
            <input
              id={`oat-${listingId}`}
              type="datetime-local"
              value={proposedAt}
              onChange={(e) => setProposedAt(e.target.value)}
              className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white focus:outline-none focus:border-white/30 [color-scheme:dark]"
            />
          )}
        </Field>
        <Field label="Block length (min)" htmlFor={`odm-${listingId}`} optional>
          <input
            id={`odm-${listingId}`}
            type="number"
            min={15}
            max={300}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 60"
            className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
          />
        </Field>
      </div>
      <Field label="Message to team" htmlFor={`on-${listingId}`} optional>
        <textarea
          id={`on-${listingId}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 400))}
          placeholder="Message to the other team…"
          rows={2}
          className="w-full border border-white/10 bg-black/30 px-3 py-2 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-none"
        />
      </Field>
      {apiError && <InlineNotice tone="critical">{apiError}</InlineNotice>}
      <div className="flex justify-end gap-2 pt-1">
        <Button
          variant="ghost"
          onClick={onClose}
          className="text-[13px] text-white/55 hover:text-white rounded-none border border-white/[0.08]"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={offerMutation.isPending}
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-none px-5 text-[13px]"
        >
          {offerMutation.isPending ? 'Sending…' : 'Request Scrim'}
        </Button>
      </div>
    </div>
  );
}
