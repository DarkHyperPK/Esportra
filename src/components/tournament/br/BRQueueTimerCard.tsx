import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock3, TimerReset, Waves } from 'lucide-react';

interface BRQueueTimerCardProps {
  queueTimerMinutes: number | null;
  activeCode: string | null;
  queueRemainingMs: number | null;
  queueEndsAtMs: number | null;
  queueCountdownLabel: string | null;
}

export const BRQueueTimerCard: React.FC<BRQueueTimerCardProps> = ({
  queueTimerMinutes,
  activeCode,
  queueRemainingMs,
  queueEndsAtMs,
  queueCountdownLabel,
}) => {
  if (!queueTimerMinutes) return null;

  const totalMs = queueTimerMinutes * 60_000;
  const elapsedMs = queueRemainingMs != null ? Math.max(0, totalMs - queueRemainingMs) : 0;
  const progressValue = totalMs > 0 ? Math.min(100, (elapsedMs / totalMs) * 100) : 0;

  const state = !activeCode
    ? 'waiting-code'
    : queueEndsAtMs === null
      ? 'syncing'
      : queueRemainingMs && queueRemainingMs > 0
        ? 'countdown'
        : 'closed';

  const config = {
    'waiting-code': {
      icon: Clock3,
      badge: 'Waiting for code',
      badgeClass: 'border-white/10 text-zinc-300',
      title: `Join window ready: ${queueTimerMinutes} minute${queueTimerMinutes === 1 ? '' : 's'}`,
      description: 'The countdown will begin the moment the organizer publishes the live lobby code.',
    },
    syncing: {
      icon: Waves,
      badge: 'Syncing',
      badgeClass: 'border-sky-500/30 text-sky-300',
      title: 'Join window syncing',
      description: 'The lobby code is live and the countdown is syncing across all players.',
    },
    countdown: {
      icon: TimerReset,
      badge: 'Join window live',
      badgeClass: 'border-amber-500/30 text-amber-300',
      title: queueCountdownLabel ? `${queueCountdownLabel} remaining` : 'Join window live',
      description: `Players have ${queueTimerMinutes} minute${queueTimerMinutes === 1 ? '' : 's'} from code release to queue up.`,
    },
    closed: {
      icon: CheckCircle2,
      badge: 'Countdown complete',
      badgeClass: 'border-emerald-500/30 text-emerald-300',
      title: 'Join window finished',
      description: 'The configured countdown has ended. Players can still use the live code shown above.',
    },
  } as const;

  const current = config[state];
  const Icon = current.icon;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/30">
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-white">Queue timer</p>
              <Badge variant="outline" className={current.badgeClass}>
                {current.badge}
              </Badge>
            </div>
            <p className="text-lg font-bold tracking-tight text-white">{current.title}</p>
            <p className="mt-1 text-xs text-zinc-400">{current.description}</p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-right">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Configured</p>
          <p className="text-base font-semibold text-white">
            {queueTimerMinutes}m
          </p>
        </div>
      </div>

      {state === 'countdown' && (
        <div className="mt-4 space-y-2">
          <Progress value={progressValue} className="h-2 bg-white/5 [&>div]:bg-amber-400" />
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span>Code published</span>
            <span>Countdown ends</span>
          </div>
        </div>
      )}
    </div>
  );
};
