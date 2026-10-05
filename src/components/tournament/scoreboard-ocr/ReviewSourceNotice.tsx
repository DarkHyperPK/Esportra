import { BadgeCheck, TriangleAlert } from 'lucide-react';

/**
 * Where the review's numbers came from. Riot's record is exact; a screenshot read can be wrong, so the
 * captain is asked to check it against the image before sending.
 */
export function ReviewSourceNotice({ fromRiot }: { fromRiot: boolean }) {
  if (fromRiot) {
    return (
      <p className="flex items-start gap-2 text-[13px] leading-relaxed text-emerald-300" role="status">
        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          Matched to Riot's record of this game. Names, K/D/A, ACS and the score come from Riot.
          <span className="text-zinc-400"> Check anything else against your screenshot.</span>
        </span>
      </p>
    );
  }
  return (
    <p className="flex items-start gap-2 text-[13px] leading-relaxed text-amber-200/90" role="note">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
      <span>
        Read automatically from your screenshot. It can make mistakes, so check every number against the image before you
        send. Highlighted cells were hard to read.
      </span>
    </p>
  );
}
