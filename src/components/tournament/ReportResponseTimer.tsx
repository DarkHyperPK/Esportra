import { useEffect, useRef, useState } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { responseWindowText, secondsLeft } from '@/services/matchReports/responseWindow';

interface Props {
  acceptBy: string;
  /** The viewer is on the reporting side (they wait); otherwise they are the side that has to answer. */
  ownSide: boolean;
  opponentName: string;
  /** Called once when the window closes, to pick up the automatic acceptance. */
  onExpire: () => void;
}

/** Live countdown of the opponent's 15-minute response window on a pending result. */
export function ReportResponseTimer({ acceptBy, ownSide, opponentName, onExpire }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const expired = useRef(false);
  const seconds = secondsLeft(acceptBy, now);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (seconds > 0 || expired.current) return;
    expired.current = true;
    // The server accepts it at the deadline; give the job a moment before refetching.
    const id = window.setTimeout(onExpire, 4000);
    return () => window.clearTimeout(id);
  }, [seconds, onExpire]);

  const urgent = !ownSide && seconds > 0 && seconds <= 120;
  return (
    <p
      className={cn(
        'flex items-start gap-2 border px-3 py-2 text-left text-xs leading-relaxed',
        urgent ? 'border-amber-400/40 bg-amber-400/[0.06] text-amber-200' : 'border-white/[0.07] bg-black/20 text-zinc-300',
      )}
      role="timer"
      aria-live={urgent ? 'polite' : 'off'}
    >
      <Timer className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', urgent ? 'text-amber-300' : 'text-zinc-500')} aria-hidden />
      <span className="tabular-nums">{responseWindowText(seconds, ownSide, opponentName)}</span>
    </p>
  );
}
