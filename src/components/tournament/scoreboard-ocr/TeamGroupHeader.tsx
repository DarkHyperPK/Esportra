import { cn } from '@/lib/utils';
import EntityAvatar from '@/components/ui/EntityAvatar';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import { desktopGridClass, mobileStatsGridClass, type ReviewStat } from './reviewStats';

interface Props {
  name: string;
  logo?: string;
  rounds: number | null;
  leading: boolean;
  stats: ReviewStat[];
  /** Rows the reader couldn't place on a team: no logo or score, an amber title. */
  unassigned?: boolean;
}

/** The team lockup on top of its rows: logo, name and rounds, with the stat labels aligned to the columns. */
export function TeamGroupHeader({ name, logo, rounds, leading, stats, unassigned = false }: Props) {
  return (
    <div className="border-b border-white/[0.07] px-2 py-1.5">
      <div className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-1.5', desktopGridClass(stats.length))}>
        <div className="flex min-w-0 items-center gap-2 sm:col-span-2">
          {unassigned ? null : <EntityAvatar src={logo} name={name} type="team" size="h-6 w-6" className="rounded-none" />}
          <h4 className={cn('truncate font-heading text-sm font-bold', unassigned ? 'text-amber-300' : 'text-white')}>{name}</h4>
          {rounds != null && !unassigned ? (
            <span className={cn('font-heading text-sm font-black tabular-nums', leading ? 'text-white' : 'text-zinc-500')}>{rounds}</span>
          ) : null}
        </div>
        {stats.map((s) => (
          <span key={s.key} title={s.title} className={cn(EYEBROW_CLASS, 'hidden text-center sm:block')}>{s.label}</span>
        ))}
        <span className="hidden sm:block" aria-hidden />
      </div>
      <div className={cn('mt-1 grid gap-1 sm:hidden', mobileStatsGridClass(stats.length))} aria-hidden>
        {stats.map((s) => <span key={s.key} className={`${EYEBROW_CLASS} text-center`}>{s.label}</span>)}
      </div>
    </div>
  );
}
