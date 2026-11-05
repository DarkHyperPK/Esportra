/**
 * ScrimOfferForm.tsx
 *
 * Inline offer form that expands below a ScrimDiscoveryCard (PROJ-077 T10).
 * Upgraded copy: "Session duration (min)", "Message to team", "Request Scrim".
 * Game-aware team filter: only shows teams whose gameSlug matches the listing.
 */

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { InlineNotice, Field } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { useMakeOffer } from '@/hooks/competitive/useScrims';
import { useMyTeamsSummary } from '@/hooks/useNavTeamStatus';
import { ApiError, getApiErrorMessage } from '@/lib/apiClient';

interface ScrimOfferFormProps {
  listingId: string;
  gameSlug: string | null;
  /** Match format fixed by the listing; shown as a locked chip. */
  bestOf?: number | null;
  /** ISO start time (from a picked slot) — sent as-is, displayed localised. */
  prefilledProposedAt?: string;
  slotId?: string;
  onClose: () => void;
}

function formatProposedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ScrimOfferForm({
  listingId,
  gameSlug,
  prefilledProposedAt,
  slotId,
  onClose,
}: ScrimOfferFormProps) {
  const offerMutation = useMakeOffer(listingId);
  const teamsQuery = useMyTeamsSummary();
  const allTeams = (teamsQuery.data ?? []) as {
    id: string;
    name: string;
    gameSlug?: string | null;
    primary_game_slug?: string | null;
  }[];
  // /api/teams/me is not camel-cased, so read the snake_case field too.
  const teams = gameSlug
    ? allTeams.filter((t) => {
        const slug = t.primary_game_slug ?? t.gameSlug;
        return !slug || slug === gameSlug;
      })
    : allTeams;

  const [offeringTeamId, setOfferingTeamId] = useState('');
  const [proposedAt, setProposedAt] = useState(prefilledProposedAt ?? '');
  const [notes, setNotes] = useState('');
  const [teamIdError, setTeamIdError] = useState('');
  const [apiError, setApiError] = useState('');
  const [submitted, setSubmitted] = useState(false);

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
        notes: notes.trim() || undefined,
        slotId: slotId || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setApiError('Only a team captain or manager can send a scrim offer.');
      } else if (err instanceof ApiError && err.status === 400) {
        setApiError(getApiErrorMessage(err, 'This listing is no longer open for offers.'));
      } else {
        setApiError(getApiErrorMessage(err, 'Could not send offer. Try again.'));
      }
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-6 text-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        <div>
          <p className="text-[14px] font-semibold text-white">Scrim request sent!</p>
          <p className="mt-1 text-[12px] text-white/50">
            Waiting for the other team to accept. We'll notify you once they respond.
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={onClose}
          className="mt-1 rounded-lg border border-white/[0.08] text-[13px] text-white/55 hover:text-white rounded-lg font-sans text-[13px] font-semibold normal-case tracking-normal"
        >
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/[0.08] bg-black/35 p-4">
      <p className="text-[11px] font-medium text-white/30">
        Send scrim offer
      </p>
      {teams.length > 1 && (
        <Field label="Your team" htmlFor={`oti-${listingId}`}>
          <select
            id={`oti-${listingId}`}
            value={offeringTeamId}
            onChange={(e) => setOfferingTeamId(e.target.value)}
            className="h-10 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 text-[13px] text-white focus:outline-none focus:border-white/30"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {teamIdError && (
            <p role="alert" className="mt-1 text-xs text-red-300">
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
      <Field label="Suggested time" htmlFor={`oat-${listingId}`} optional>
        {prefilledProposedAt ? (
          <div className="flex h-10 items-center rounded-lg border border-white/[0.08] bg-black/20 px-3 text-[13px] text-white/70">
            {formatProposedAt(prefilledProposedAt)}
          </div>
        ) : (
          <input
            id={`oat-${listingId}`}
            type="datetime-local"
            value={proposedAt}
            onChange={(e) => setProposedAt(e.target.value)}
            className="h-10 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 text-[13px] text-white focus:outline-none focus:border-white/30 [color-scheme:dark]"
          />
        )}
      </Field>
      <Field label="Message to team" htmlFor={`on-${listingId}`} optional>
        <textarea
          id={`on-${listingId}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 400))}
          placeholder="Message to the other team…"
          rows={2}
          className="w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-none"
        />
      </Field>
      {apiError && <InlineNotice tone="critical">{apiError}</InlineNotice>}
      <div className="flex justify-end gap-2 pt-1">
        <Button
          variant="ghost"
          onClick={onClose}
          className="rounded-lg border border-white/[0.08] text-[13px] text-white/55 hover:text-white rounded-lg font-sans text-[13px] font-semibold normal-case tracking-normal"
        >
          Cancel
        </Button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={offerMutation.isPending}
          className="min-h-[40px] rounded-lg bg-white px-5 text-[13px] font-semibold text-black transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40"
        >
          {offerMutation.isPending ? 'Sending…' : 'Send offer'}
        </button>
      </div>
    </div>
  );
}
