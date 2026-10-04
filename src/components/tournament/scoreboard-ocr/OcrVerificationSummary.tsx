import { ShieldAlert } from 'lucide-react';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import { needsReview } from '@/services/scoreboardOcr';
import type { OcrVerification, TeamSlot } from '@/types/scoreboardOcr';
import { VerificationBadge } from './VerificationBadge';

interface Props {
  verification: OcrVerification | null | undefined;
  teamNames: Record<TeamSlot, string>;
  /** Opponent only: open the dispute form with these findings filled in. */
  onDispute?: () => void;
}

const FLAG_TEXT = {
  screenshot_reused: 'This screenshot was also uploaded for another match.',
  date_mismatch: 'The date on the screenshot is far from this match.',
} as const;

/** How the players on a screenshot report matched the competitors' rosters. */
export function OcrVerificationSummary({ verification, teamNames, onDispute }: Props) {
  if (!verification) return null;
  const review = needsReview(verification);
  const verified = verification.players.filter((p) => p.status === 'verified').length;
  const flags = verification.flags.filter((f) => f in FLAG_TEXT);
  return (
    <section aria-label="Player check" className="space-y-2 border border-white/[0.07] bg-black/20 px-3 py-2.5 text-left">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={EYEBROW_CLASS}>Player check</p>
        <p className="font-mono text-[11px] text-zinc-400">
          {verified} of {verification.players.length} on a verified Riot ID
        </p>
      </div>
      {review.length === 0 && flags.length === 0 ? (
        <p className="text-xs text-zinc-400">Everyone on the screenshot is on {teamNames.team1}'s or {teamNames.team2}'s roster.</p>
      ) : (
        <ul className="space-y-1">
          {review.map((player) => (
            <li key={player.index} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-sm">
              <span className="min-w-0 truncate font-medium text-white">
                {player.name}
                {player.status === 'edited' && player.readName ? (
                  <span className="ml-1 font-normal text-zinc-500">(screenshot: “{player.readName}”)</span>
                ) : null}
              </span>
              <VerificationBadge status={player.status} />
            </li>
          ))}
          {flags.map((flag) => (
            <li key={flag} className="text-xs text-amber-300">{FLAG_TEXT[flag]}</li>
          ))}
        </ul>
      )}
      {onDispute && (review.length > 0 || flags.length > 0) ? (
        <button
          type="button"
          onClick={onDispute}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300 underline-offset-4 transition-colors hover:text-rose-200 hover:underline"
        >
          <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
          Dispute with these details
        </button>
      ) : null}
    </section>
  );
}
