import { BadgeCheck, Sparkles } from 'lucide-react';

/**
 * What the reader filled in. Confident by default: the captain only hears about cells the reader
 * genuinely couldn't make out (they are highlighted), never a blanket "check everything".
 */
export function ReviewSourceNotice({ hardToRead }: { hardToRead: number }) {
  if (hardToRead === 0) {
    return (
      <p className="flex items-start gap-2 text-[13px] leading-relaxed text-emerald-300" role="status">
        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>Everything's filled in from your screenshot. Send it when you're ready.</span>
      </p>
    );
  }
  return (
    <p className="flex items-start gap-2 text-[13px] leading-relaxed text-zinc-300" role="status">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
      <span>
        Filled in from your screenshot.{' '}
        {hardToRead === 1 ? 'One spot was' : `${hardToRead} spots were`} hard to make out and{' '}
        {hardToRead === 1 ? 'is' : 'are'} highlighted.
      </span>
    </p>
  );
}
